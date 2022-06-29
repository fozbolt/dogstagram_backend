const { spawn } = require('child_process');

const command = spawn('python', ["./test.py", 1, 2]);

let result = '';

command.stdout.on('data', function (data) {
  result += data.toString();
});
command.on('close', function (code) {
  console.log("RESULT: ", result);
  //return result
});



