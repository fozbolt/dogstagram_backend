const { spawn } = require('child_process');

//treba imati cwd jer inace ne executa python skriptu osim ako ju ne zovemo bas iz foldera u kojem se nalazi
process.chdir('\image_validation');
const command = spawn('python', ["./test.py", 1, 2]);

let result = '';


command.stdout.on('data', function (data) {
  result += data.toString();
});
command.on('close', function (code) {
  console.log("RESULT: ", result);
  //return result
});



