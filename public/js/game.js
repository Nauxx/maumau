// Make connection
var socket = io.connect("http://localhost:2000");

$(document).ready(function () {
  // Emit events
  $("#start").click(function () {
    socket.emit("start");
  });

  // Listen for events
  socket.on("started", function (data) {
    $(".you-are").html("You are Player " + data.position);
    updateDisplay(data);
    updateCards(data.hand);
  });

  socket.on("card played", (data) => {
    updateCards(data.hand);
  });

  socket.on("end turn", function (data) {
    console.log("Ich update das Display");
    updateDisplay(data);
  });

  socket.on("illegal move", function (data) {
    switch (data.error) {
      case 201:
        alert(`No no no, buddy. Gotta draw ${data.chain7} first!`);
        break;
      case 202:
        alert("No Jack-on-Jack action, sorry. This is a family game.");
        break;
      case 203:
        alert("With that Suit?! Please respect the Dresscode!");
        break;
      case 204:
        alert("No match for you, sorry. Try another card, buddy!");
        break;
      case 205:
        alert("Server didn't return a predefined move value");
        break;
      case 206:
        alert("Maybe leave some cards for the rest, ya greedy bugger!");
        break;
      case 207:
        alert("I think you forgot something. Might wanna check the deck...");
        break;
      default:
        alert("connection issue... probably...?");
    }
  });

  socket.on("drawn card", function (data) {
    updateCards(data.hand);
  });

  socket.on("dresscode", (fn) => {
    let suit;
    $(".modal").show();
    $(".modal-content").on("click", "*", function () {
      switch ($(this).attr("id")) {
        case "wish-heart":
          suit = "Hearts";
          break;
        case "wish-diamonds":
          suit = "Diamonds";
          break;
        case "wish-clubs":
          suit = "Clubs";
          break;
        case "wish-spades":
          suit = "Spades";
          break;
        default:
          alert(
            "ERRRROOOOOOOOORRRRRRR1111!!! SOMETHING WENT WRONG WITH THE WISHES"
          );
      }
      $(".modal").hide();
      fn(suit);
    });
  });

  socket.on("active", () => {
    //Removes all listeners in case you play an 8 and get "active" again before
    //"inactive" had a chance to remove listener
    //in that case, another listener will be added with every 8, so when you play a card
    //you will send n(= number of 8's) requests to the server
    $("#start, .hand, #deck, #pass").off().addClass("inactive");

    $(".hand").on("click", "*", function () {
      socket.emit("play card", { card: $(this).attr("id") });
      //playCard($(this).attr("id"));
    });

    $("#deck").on("click", function () {
      socket.emit("draw card");
    });

    $("#pass").click(function () {
      socket.emit("pass");
    });

    $(" .hand, #deck, #pass").removeClass("inactive");
  });

  socket.on("inactive", () => {
    $("#start, .hand, #deck, #pass").off().addClass("inactive");
  });

  socket.on("victory", () => {
    $(".you-are").html("Someone has won ze game!!");
    $("#start").removeClass("inactive");
    $("#start").click(function () {
      socket.emit("start");
    });
  });

  // Static functions

  function updateCards(hand) {
    //UPDATE HAND
    $(".hand").empty();
    let count = hand.length;
    for (i = 0; i < count; i++) {
      $(".hand").append(
        `<div class="card ${hand[i].suit}" id="${i}">${
          hand[i].value + " of " + hand[i].suit
        }</div>`
      );
    }
  }

  function updateDisplay(globalVars) {
    console.log("wished suit in updateDisplay:", globalVars.wishedSuit);
    // UPDATE TOPCARD
    $("#topcard")
      .removeClass()
      .addClass(globalVars.topCard.suit + " " + "card");
    // mehrere Klassen müssen durch Leer getrennt werden oder Backticks verwenden
    $("#topcard").html(
      globalVars.topCard.value + " of " + globalVars.topCard.suit
    );

    // UPDATE PLAYER'S TURN
    $(".player-x").html("It's Player " + (globalVars.turn + 1) + "'s turn!");

    // UPDATE WISHED SUIT
    if (!globalVars.wishedSuit) {
      $(".wished-suit").html("Dresscode:");
    } else $(".wished-suit").html("Dresscode: " + globalVars.wishedSuit);
  }
});
