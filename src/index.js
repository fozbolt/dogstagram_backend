import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import storage from './memory_storage.js';
import cors from 'cors';
import connect from './db.js';
import mongo from 'mongodb';
import auth from './auth';
import py from './image_validation/py.js';
import p1 from './image_validation/new.js';

const app = express(); // instanciranje aplikacije
const port = 3000; // port na kojem će web server slušati

app.use(cors());
app.use(express.json()); // automatski dekodiraj JSON poruke

app.get('/tajna', [auth.verify], async (req, res) => {
    // nakon što se izvrši auth.verify middleware, imamo dostupan req.jwt objekt
    res.status(200).send('tajna korisnika ' + req.jwt.username);
});


//promjena lozinke
app.patch('/change_password', [auth.verify], async (req, res) => {
    let changes = req.body;
    if (changes.new_password && changes.old_password) {
        let result = await auth.changeUserPassword(req.jwt.username, changes.old_password, changes.new_password);
        if (result) {
            res.status(201).send();
        } else {
            res.status(500).json({ error: 'cannot change password' });
        }
    } else {
        res.status(400).json({ error: 'unrecognized request' });
    }
});

app.post('/auth', async (req, res) => {
    let user = req.body;
    let username = user.username;
    let password = user.password;
   
    try {
        let result = await auth.authenticateUser(username, password);
        res.status(201).json(result);
    } catch (e) {
        res.status(500).json({
            error: e.message,
        });
    }
});

app.post('/register', async (req, res) => {
    let user = req.body.new_user;

    try {
        let result = await auth.registerUser(user);
        //loše za sigurnost: šaljemo ne heshiran password koji je korisnik poslao - nazad na front  
        res.status(201).send(true);
    } catch (e) {
        res.status(500).json({
            error: e.message,
        });
    }
});

// let primjer_middleware = (res, req, next) => {
//     console.log('Ja se izvršavam prije ostatka handlera za rutu');
//     res.varijabla_1 = 'OK';
//     next();
// };
// let primjer_middleware_2 = (res, req, next) => {
//     console.log('I ja se isto izvršavam prije ostatka handlera za rutu');
//     res.varijabla_2 = 'isto OK';
//     next();
// };
// app.get('/primjer', [primjer_middleware, primjer_middleware_2], (req, res) => {
//     console.log('.. a tek onda se ja izvršavam.');
//     console.log(req.varijabla_1);
//     console.log(req.varijabla_2);

//     res.send('OK');
// });

app.patch('/posts/:id', async (req, res) => {
    let doc = req.body;
    delete doc._id;
    let id = req.params.id;
    let db = await connect();

    let result = await db.collection('posts').updateOne(
        { _id: mongo.ObjectId(id) },
        {
            $set: doc,
        }
    );
    if (result.modifiedCount == 1) {
        res.json({
            status: 'success',
            id: result.insertedId,
        });
    } else {
        res.status(500).json({
            status: 'fail',
        });
    }
});

app.put('/posts/:id', async (req, res) => {
    let doc = req.body;
    delete doc._id;
    let id = req.params.id;
    let db = await connect();

    let result = await db.collection('posts').replaceOne({ _id: mongo.ObjectId(id) }, doc);
    if (result.modifiedCount == 1) {
        res.json({
            status: 'success',
            id: result.insertedId,
        });
    } else {
        res.status(500).json({
            status: 'fail',
        });
    }
});

app.post('/posts', async (req, res) => {
    let db = await connect();
    let doc = req.body;
    
    if (!(doc.createdBy || doc.title || doc.source || doc.postedAt)){
        res.json({
            status: 'fail',
            reason: 'incomplete_post'
        })
        return
    }

    let result = await db.collection('posts').insertOne(doc);
    if (result.insertedCount == 1) {
        res.json({
            status: 'success',
            id: result.insertedId,
        });
    } else {
        res.json({
            status: 'fail',
        });
    }
});

//delete reply to comment
app.delete('/posts/:postId/comments/:commentId/replies/:replyId', async (req, res) => {
    let db = await connect();
    let postId = req.params.postId;
    let commentId = req.params.commentId;
    let replyId = req.params.replyId;

    let result = await db.collection('posts').updateOne(
        { _id: mongo.ObjectId(postId), comments: {$elemMatch: {_id: mongo.ObjectId(commentId)}} },
        {
            //mongo direktiva $pull za micanje
            $pull: { "comments.$.replies": {_id: mongo.ObjectId(replyId)} },
        }
    );
    if (result.modifiedCount == 1) {
        res.status(201).send();
    } else {
        res.status(500).json({
            status: 'fail',
        });
    }
});



//delete comment
app.delete('/posts/:postId/comments/:commentId', async (req, res) => {
    let db = await connect();
    let postId = req.params.postId;
    let commentId = req.params.commentId;

    let result = await db.collection('posts').updateOne(
        { _id: mongo.ObjectId(postId) },
        {
            // sada koristimo mongo direktivu $pull za micanje
            // vrijednosti iz odabranog arraya `comments`
            // komentar pretražujemo po _id-u
            $pull: { comments: { _id: mongo.ObjectId(commentId) } },
        }
    );
    if (result.modifiedCount == 1) {
        res.status(201).send();
    } else {
        res.status(500).json({
            status: 'fail',
        });
    }
});

//add comment
app.post('/posts/:postId/comments', async (req, res) => {
    let db = await connect();
    let doc = req.body;
    let postId = req.params.postId;

    // u mongu dokumenti unutar postojećih dokumenata ne dobivaju
    // automatski novi _id, pa ga moramo sami dodati
    doc._id = mongo.ObjectId();

    // datume je ispravnije definirati na backendu
    doc.posted_at = Date.now();

    // inicijalizacija praznog arraya zbog search filtera na change reply
    doc.replies = [];

    let result = await db.collection('posts').updateOne(
        { _id: mongo.ObjectId(postId) },
        {
            // operacija $push dodaje novu vrijednost u
            // atribut `comments`, a ako on ne postoji
            // automatski ga stvara i postavlja na []
            $push: { comments: doc },
        }
    );
    if (result.modifiedCount == 1) {
        res.json({
            status: 'success',
            id: doc._id,
        });
    } else {
        res.status(500).json({
            status: 'fail',
        });
    }
});


//change comment AND add reply
//dodoati na sve ovakve rute i middleware [auth.verify]
//saljem u body-u comment id i u paramatru/queryu - ispraviti - za sad korisnim onaj iz body-a --ovo se odnosi na sve rute vezane uz komentare
app.patch('/posts/:postId/comments/:commentId', async (req, res) => {
    let db = await connect();
    let doc = req.body;
    let postId = req.params.postId;
    let commentId = req.params.commentId;
    
    doc._id = mongo.ObjectId();
    let result = undefined;

    if (doc.type==='main'){
        delete doc.type
        //cisto da ne bude da su komentari stariji od posta
        //doc.posted_at = Date.now();

        result = await db.collection('posts').updateOne(
        
            { _id: mongo.ObjectId(postId), comments: {$elemMatch: {_id: mongo.ObjectId(commentId)}} },
            {              
                //ovo se da i direktnije/automatski kad posaljemo objekt da izmijeni sva ona polja koja smo poslali u tom objektu
                $set: { "comments.$.comment": doc.comment },
            });    
    }   
    else if (doc.type==='reply'){
        delete doc.type
        result = await db.collection('posts').updateOne(
      
            { _id: mongo.ObjectId(postId), comments: {$elemMatch: {_id: mongo.ObjectId(commentId)}} },
            {              
                $push: { "comments.$.replies": doc },
            });
    }
    

    if (result.modifiedCount == 1) {
        res.json({
            status: 'success',
            id: doc._id,
        });
    } else {
        res.status(500).json({
            status: 'fail',
        });
    }
});





//change reply
app.patch('/posts/:postId/comments/:commentId/replies/:replyId', async (req, res) => {
    let db = await connect();
    let doc = req.body;
    let postId = req.params.postId;
    let commentId = req.params.commentId;
    let replyId = req.params.replyId;
  
    doc._id = mongo.ObjectId(replyId);
    doc.posted_at = Date.now();


    let result = await db.collection('posts').updateOne(

        // "comments.$[].replies.$[category].username" za izmjenu jednog atribura u objektu

        { _id: mongo.ObjectId(postId)},
        {$set: {"comments.$[].replies.$[category]": doc}},
        { arrayFilters: [ {"category._id": mongo.ObjectId(replyId)} ] }
        
    );
  
    if (result.modifiedCount == 1) {
        res.json({
            status: 'success',
            id: doc._id,
        });
    } else {
        res.status(500).json({
            status: 'fail',
        });
    }
});

app.get('/posts/:id', [auth.verify], async (req, res) => {
    let id = req.params.id;
    let db = await connect();
    let document = await db.collection('posts').findOne({ _id: mongo.ObjectId(id) });

    res.json(document);
});



app.get('/posts', [auth.verify], async (req, res) => {
    let db = await connect();
    let query = req.query;

    let selekcija = {};

    if (query._any) {
        // za upit: /posts?_all=pojam1 pojam2
        let pretraga = query._any;
        let terms = pretraga.split(' ');

        let atributi = ['title', 'createdBy'];

        selekcija = {
            $and: [],
        };

        terms.forEach((term) => {
            let or = {
                $or: [],
            };

            atributi.forEach((atribut) => {
                or.$or.push({ [atribut]: new RegExp(term) });
            });

            selekcija.$and.push(or);
        });
    }

    let cursor = await db.collection('posts').find(selekcija);
    let results = await cursor.toArray();

    res.json(results);
});


//validate images - dummy route
app.put('/posts', async (req, res) => {
    
    let blob = req.params.blob;
    //console.log(py.pyMethod());
    await console.log(p1.main());

    res.json(blob);
});


//add reply - spojen s change comment zbog identicne rute
// app.patch('/posts/:postId/comments/:commentId', async (req, res) => {
//     let db = await connect();
//     let doc = req.body;
//     let postId = req.params.postId;
//     let commentId = req.params.commentId;
//     console.log('serveeeeeeeeeeeeeeeeeeeee');
//     // u mongu dokumenti unutar postojećih dokumenata ne dobivaju
//     // automatski novi _id, pa ga moramo sami dodati
//     doc._id = mongo.ObjectId();
//     doc.posted_at = Date.now();

//     let result = await db.collection('posts').updateOne(
      
//         { _id: mongo.ObjectId(postId), comments: {$elemMatch: {_id: mongo.ObjectId(commentId)}} },
//         {
            
//             $push: { "comments.$.replies": doc },
//         }
//     );
//     if (result.modifiedCount == 1) {
//         res.json({
//             status: 'success',
//             id: doc._id,
//         });
//     } else {
//         res.status(500).json({
//             status: 'fail',
//         });
//     }
// });


app.listen(port, () => console.log(`Slušam na portu ${port}!`));
