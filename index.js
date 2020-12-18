//////////////////////////////////// SERVER SETUP ////////////////////////////////////////////////

var express = require("express");
var socket = require("socket.io");
const fs = require("fs");

// App setup
var port = 2000;
var app = express();
var server = app.listen(port, function () {
  console.log("listening on port " + port);
});

// Static files
app.use(express.static("public"));

// Socket setup
var io = socket(server);

//////////////////////////////////// GAME LOGIC ////////////////////////////////////////////////

/////////////////////////////////////// GLOBAL VARIABLES //////////////////////////////////////

// Create Deck of Cards (32)
let deck;

// Provisional lobby
let lobby = [];

// Player Array
let players = [];

// Turn Counter
let turn = 0;

// Cards already played
let discardPile;

// Active Card
let topCard;

// Jack wish
let wishedSuit;

// 7er
let chain7;

// Counter for passing
let alreadyDrawn;

// Dynamic cards per player count
let cardsPerPlayer = 5;

/////////////////////////////////////// GLOBAL FUNCTIONS //////////////////////////////////////

function startGame() {
  players = [...lobby];
  try {
    const data = JSON.parse(fs.readFileSync("starting.json", "utf8"));
    //console.log(data.deck32);
    deck = [...data.deck32];
    turn = data.turn;
    discardPile = [...data.discardPile];
    topCard = data.topCard;
    wishedSuit = data.wishedSuit;
    chain7 = data.chain7;
    alreadyDrawn = data.alreadyDrawn;
  } catch (err) {
    console.error(err);
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i

    // swap elements array[i] and array[j]
    // we use "destructuring assignment" syntax to achieve that
    // same can be written as:
    // let t = array[i]; array[i] = array[j]; array[j] = t
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function dealCards() {
  //let numberOfPlayers = Object.keys(players).length;

  for (item in players) {
    let cards = deck.splice(0, cardsPerPlayer);
    players[item].hand.splice(0, players[item].hand.length);
    players[item].hand = [...cards];
  }

  topCard = deck.splice(0, 1);
  //console.log(deck, players, topCard, "vorher");
  //this console logs topCard as e.g. "Jack" correctly but also the topCard as already shuffled
  //into the deck. The new topCard is not displayed, but in the "after log everything is correct..."

  while (
    topCard[0].value == "Jack" ||
    topCard[0].value == "7" ||
    topCard[0].value == "8"
  ) {
    let rnd = Math.floor(Math.random() * deck.length);
    deck.splice(rnd, 0, topCard[0]);
    topCard = deck.splice(0, 1);
  }

  /* updateCards(players[turn]);
  updateDisplay(); */
}

function playCard(card) {
  //console.log(card);
  // Sonderregeln fuer Bube und 7
  /* if (players[turn].hand[card].value == "Jack") {
    //dressCode();
  } else */ if (
    topCard[0].value == "Jack" &&
    players[turn].hand[card].value == "7"
  ) {
    wishedSuit = "";
    chain7 += 2;
  } else if (topCard[0].value == "Jack") {
    wishedSuit = "";
  } else if (players[turn].hand[card].value == "7") {
    chain7 += 2;
  }

  //Karte wird gespielt und aus Hand entfernt
  discardPile.unshift(topCard[0]);
  topCard[0] = players[turn].hand[card];
  players[turn].hand.splice(card, 1);

  io.to(players[turn].id).emit("card played", { hand: players[turn].hand });

  /* if (players[turn].hand.length == 0) {
    return "end";
  } */

  //Next move
  if (players[turn].hand.length == 0) {
    return "end";
  } else if (topCard[0].value == "8") {
    // Sonderregel fuer 8
    endTurn(2);
  } else {
    endTurn(1);
  }
}

function legalMove(card) {
  //console.log(card);
  if (chain7 != 0) {
    if (card.value != "7") {
      //alert(`No no no, buddy. Gotta draw ${chain7} first!`);
      return 201;
    } else return 200;
  } else if (topCard[0].value == "Jack" && wishedSuit) {
    if (card.value == "Jack") {
      //alert("No Jack-on-Jack action, sorry. This is a family game.");
      return 202;
    } else if (card.suit != wishedSuit) {
      //alert("With that Suit?! Please respect the Dresscode!");
      return 203;
    } else return 200;
  } else if (
    topCard[0].suit != card.suit &&
    topCard[0].value != card.value &&
    card.value != "Jack"
  ) {
    //alert("No match for you, sorry. Try another card, buddy!");
    return 204;
  } else return 200;
}

function endTurn(skipFactor) {
  turn = (turn += skipFactor) % players.length;
  alreadyDrawn = false;
  //console.log(turn);
}

function drawCard() {
  for (i = -1; i != 0; i = chain7) {
    if (deck.length == 1) {
      shuffle(discardPile); // shuffles discard pile (duh!)
      deck = [...discardPile]; // copies all elements of discard pile into (empty) deck
      discardPile.splice(0, discardPile.length); // deletes discard pile
      // deck = discardPile; WRONG!!! THINK ABOUT REFERENCES!!!
    }

    players[turn].hand.push(deck[0]);
    deck.splice(0, 1);

    //updateCards(players[turn]);

    if (chain7 > 0) chain7--;
  }
}

//////////////////////////////////// CONNECTIONS ////////////////////////////////////////////////

io.on("connection", function (socket) {
  console.log("socket " + socket.id + " connected!!");

  lobby.push({
    id: socket.id,
    hand: [],
  });

  socket.on("disconnect", () => {
    //console.log("Lobby before: ", lobby);
    console.log(socket.id + " disconnected");
    lobby.forEach((item, index) => {
      if (socket.id == item.id) lobby.splice(index, 1);
    });
    /* 
    // Breaking after you find your player so you don't have to loop over the whole array
    // Not really necessary for a 4-8 item array, but keep in mind
    for (i=0;i<lobby.length;i++){
      if (socket.id == item.id) lobby.splice(i, 1);
      break;
    } */
    //console.log("Lobby after: ", lobby);
  });

  socket.on("start", function () {
    startGame();
    shuffle(deck);
    dealCards();
    players.forEach(function (player, index) {
      if (index == turn) {
        io.to(player.id).emit("active");
      } else io.to(player.id).emit("inactive");
    });
    players.forEach(function (player, index) {
      io.to(player.id).emit("started", {
        topCard: topCard[0],
        turn: turn,
        hand: player.hand,
        position: index + 1,
      });
    });
  });

  socket.on("play card", function (data) {
    //console.log(players[turn].hand[data.card], data.card);
    switch (legalMove(players[turn].hand[data.card])) {
      case 200:
        if (players[turn].hand[data.card].value == "Jack") {
          socket.emit("dresscode", (suit) => {
            //console.log(suit);
            wishedSuit = suit;
            //console.log(wishedSuit);
            playCard(data.card);
            io.emit("end turn", {
              topCard: topCard[0],
              turn: turn,
              wishedSuit: wishedSuit,
            });
            players.forEach(function (player, index) {
              if (index == turn) {
                io.to(player.id).emit("active");
              } else io.to(player.id).emit("inactive");
            });
          });
        } else {
          if (playCard(data.card) == "end") {
            io.emit("victory");
          } else {
            io.emit("end turn", {
              topCard: topCard[0],
              turn: turn,
              wishedSuit: wishedSuit,
            });
            players.forEach(function (player, index) {
              if (index == turn) {
                io.to(player.id).emit("active");
              } else io.to(player.id).emit("inactive");
            });
          }
        }

        break;
      case 201:
        socket.emit("illegal move", { error: 201, chain7: chain7 });
        break;
      case 202:
        socket.emit("illegal move", { error: 202 });
        break;
      case 203:
        socket.emit("illegal move", { error: 203 });
        break;
      case 204:
        socket.emit("illegal move", { error: 204 });
        break;
      default:
        socket.emit("illegal move", { error: 205 });
    }
  });

  socket.on("draw card", function () {
    if (!alreadyDrawn) {
      alreadyDrawn = true;
      drawCard();
      socket.emit("drawn card", { hand: players[turn].hand });
    } else socket.emit("illegal move", { error: 206 });
  });

  socket.on("pass", function () {
    if (alreadyDrawn) {
      endTurn(1);
      io.emit("end turn", {
        topCard: topCard[0],
        turn: turn,
        wishedSuit: wishedSuit,
      });
      players.forEach(function (player, index) {
        if (index == turn) {
          io.to(player.id).emit("active");
        } else io.to(player.id).emit("inactive");
      });
    } else socket.emit("illegal move", { error: 207 });
  });
  //console.log(players);
});
