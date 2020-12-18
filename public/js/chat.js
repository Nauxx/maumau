// Make connection
/* var socket = io.connect("http://localhost:2000");

$(document).ready(function () {
  // Emit events
  $("#send-btn").on("click", function () {
    socket.emit("chat", {
      message: $("#message").val(),
      name: $("#name").val(),
    });
    $("#message").val("");
  });

  // Listen for Server Communication

  socket.on("chat", function (data) {
    $("#output").append(
      "<p><strong>" + data.name + ": </strong>" + data.message + "</p>"
    );
  });
}); */

const fs = require("fs");

fs.readFile("../starting.json", (err, data) => {
  if (err) {
    console.error("error");
    return;
  }
  console.log(data);
});
