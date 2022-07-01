
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
            const command = await spawn('python', ["./dog_detection.py", 1]);
            let result = '';
        
            await command.stdout.on('data', async function (data) {
            result += data.toString();
            });

            //loša logika, ali neka bude za sad
            return new Promise((res, rej) => {
                command.stdout.on('end', async function(code){
                    //console.log('output: ' + result);
                    //console.log(`Exit code is: ${code}`);
                    process.chdir('../../')

                    res(result);
                })
            });

            //store.set('isBoot', true)            
        }
    }
    catch{
        process.chdir('../../')
        console.log('unknown error accured')
    }
  
}

