/*taken from

https://stackoverflow.com/questions/1880198/how-to-execute-shell-command-in-javascript


Namjena: automatski pokrenuti py.js preko terminala jer prije nije htjelo raditi ako se ne pokrene preko terminala, sada je ovo deprecated

*/




const { exec } = require('child_process')


//cijela ova funkcja služi da pozovem swannera i python file iz cmd-a preko nodea jer inače ne vraća vrijednosti
export default{

    /**
 * Execute simple shell command (async wrapper).
 * @param {String} cmd
 * @return {Object} { stdout: String, stderr: String }
 */
 async sh(cmd) {
    return new Promise(function (resolve, reject) {
      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          reject(err);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  },
  
  async main() {
    let { stdout } = await this.sh('node src/image_validation/spawner.js');
    for (let line of stdout.split('\n')) {
      console.log(`ls: ${line}`);
    }
  }
  

}
