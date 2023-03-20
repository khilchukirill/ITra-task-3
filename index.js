const process = require("process");
const crypto = require("crypto");
const readline = require("readline");
const Table = require("cli-table");
const colors = require("colors");

class Rules {
  constructor(moves) {
    this.moves = moves;
  }

  isValidMoves(moves) {
    return moves.length % 2 !== 0 && moves.length >= 3 && new Set(moves).size == moves.length;
  }

  determineWinner(userMoveIndex, computerMoveIndex) {
    const moveCount = this.moves.length;
    const moveDifference = (moveCount - 1) / 2;
    const nextMoves = [...this.moves.slice(userMoveIndex + 1), ...this.moves.slice(0, userMoveIndex)];
    const winningMoves = nextMoves.slice(0, moveDifference);
    if (userMoveIndex === computerMoveIndex) {
      return "draw"
    }
    return  winningMoves.includes(this.moves[computerMoveIndex]) ? "win" : "lose";
  }
}

class KeyGenerator {
  constructor() {
    this.key = crypto.randomBytes(32).toString("hex");
  }

  getKey() {
    return this.key;
  }
}

class HMAC {
  constructor(key) {
    this.key = key;
  }

  generate(message) {
    const hmac = crypto.createHmac("sha256", this.key);
    hmac.update(message);
    return hmac.digest("hex");
  }
}

class Game {
  constructor(moves) {
    this.tableGenerator = new TableGenerator(moves);
    this.rules = new Rules(moves);
    this.keyGenerator = new KeyGenerator();
    this.hmac = new HMAC(this.keyGenerator.getKey());
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  start() {
    const { isValidMoves, moves } = this.rules;

    if (!isValidMoves(moves)) {
      if (moves.length < 3) {
        console.error('Please enter at least 3 moves'.red);
      } else if (moves.length % 2 === 0) {
        console.error('Please enter an odd number of moves'.red);
      } else if (new Set(moves).size !== moves.length) {
        console.error('Please remove duplicates moves'.red);
      }
      this.rl.close();
      return;
    }

    const availableMoves = this.getTable();
    const exitOption = '0 - exit';
    const helpOption = '? - help';

    console.log(`Available moves:\n${availableMoves}\n${exitOption}\n${helpOption}`);

    this.rl.question('Enter your move: ', (userInput) => {
      if (userInput === '0') {
        console.log('See you!');
        this.rl.close();
        return;
      }

      if (userInput === '?') {
        const winningMoves = this.getWinningTable();
        console.log(`Winning moves:\n${winningMoves}\n${exitOption}\n${helpOption}`);
        this.start();
        return;
      }

      const isValidInput = this.isValidUserInput(userInput);

      if (!isValidInput) {
        console.error(`Invalid input. Please enter a number between 1 and ${this.rules.moves.length}`);
        this.start();
        return;
      }

      const userMoveIndex = userInput - 1;
      console.log(`Your move: ${this.rules.moves[userMoveIndex]}`);
      this.play(userMoveIndex);
      this.start();
    });
  }

  isValidUserInput(userInput) {
    const isNumeric = !isNaN(userInput);
    const isInRange = userInput >= 1 && userInput <= this.rules.moves.length;
    return isNumeric && isInRange;
  }

  getTable() {
    return this.tableGenerator.generate();
  }

  getWinningTable() {
    return this.tableGenerator.generateWinningTable();
  }

  getHmacKey() {
    return this.keyGenerator.getKey();
  }

  play(userMoveIndex) {
    const computerMoveIndex = crypto.randomInt(this.rules.moves.length);
    const result = this.rules.determineWinner(userMoveIndex, computerMoveIndex);
    const message = `User move: ${this.rules.moves[userMoveIndex]}\nComputer move: ${this.rules.moves[computerMoveIndex]}`;

    switch (result) {
      case "win":
        console.log("You win".green);
        console.log(`HMAC key: ${this.getHmacKey()}`);
        break;
      case "lose":
        console.log("You lose!".red);
        console.log(`HMAC key: ${this.getHmacKey()}`);
        break;
      default:
        console.log("Draw!".yellow);
        break;
    }
    console.log(`HMAC: ${this.hmac.generate(message)}`);
  }
}

class TableGenerator {
  constructor(moves) {
    this.moves = moves;
  }

  generate() {
    return this.moves.map((move, index) => `${index + 1} - ${move}`).join("\n");
  }

  generateWinningTable() {
    const head = ["computer/user", ...this.moves];
    const rows = this.moves.map((userMove, i) => {
      const resultRow = this.moves.map((computerMove, j) => {
        const result = this.getResult(i, j);
        return result;
      });
      return [userMove, ...resultRow];
    });
    const table = new Table({ head, rows });
    return table.toString();
  }

  getResult(i, j) {
    if (i === j) {
      return "Draw";
    }
    const result = game.rules.determineWinner(i, j) === "win" ? "Win" : "Lose";
    return result;
  }
}

const moves = process.argv.slice(2);
const game = new Game(moves);
colors.enable();
game.start();
