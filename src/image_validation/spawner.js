
import {PythonShell} from 'python-shell';

module.exports = async function spawner(base64_img){
    const { spawn } = require('child_process');
    
    //const store = require('store-js')

    //da se ne pokreće prilikom npm run serve
    //store.set('isBoot', true);

    //treba imati cwd jer inace ne executa python skriptu osim ako ju ne zovemo bas iz foldera u kojem se nalazi
    try{
        // MakNUTI - ova logika treba samo ako i boot pokreće ovaj file pa da ga preskoči, ali nije potreban sada kada je ovo u exports funkciji
        // if (store.get('isBoot')==false){
        //     console.log('tu')
        //     process.chdir('./src/image_validation')
        // } 
        // else store.set('isBoot', false)
        // console.log(store.get('isBoot'))
        // console.log(process.cwd())

        process.chdir('./src/image_validation')
    
        if (process.cwd().includes('\image_validation')){
         
            let pyshell = new PythonShell('dog_detection.py', { mode: 'text' });

            // sends a message to the Python script via stdin
            pyshell.send(base64_img);
            let result = undefined

            pyshell.on('message', function (message) {
            // received a message sent from the Python script (a simple "print" statement)
            console.log(message) //ako zelimo da ispisuje/vraca svaki print iz pythona, a ne samo zadnji
            result = message
            });

            // end the input stream and allow the process to exit
            return new Promise((res, rej) => {
                pyshell.end(function (err,code,signal) {
                    if (err) throw err;
                    //console.log('The exit code was: ' + code);
                    //console.log('The exit signal was: ' + signal);
                    //console.log('finished');


                    process.chdir('../../')
                    res(result)

                });
            })

            

            //store.set('isBoot', true)            
        }
    }
    catch(e){
        process.chdir('../../')
        console.log(e)
    }
  
}

