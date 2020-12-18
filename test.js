const fs = require("fs");

/* fs.readFile("starting.json", (err, data) => {
  if (err) {
    console.error("error");
    return;
  }
  let json = JSON.parse(data);
  console.log(json.turn);
}); */

try {
  const data = fs.readFileSync("starting.json", "utf8");

  let initial = JSON.parse(data);
  turn = initial.turn;
  console.log(initial.turn);
} catch (err) {
  console.log(err);
}
