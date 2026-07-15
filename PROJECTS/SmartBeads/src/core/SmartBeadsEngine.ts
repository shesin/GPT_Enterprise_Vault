import { GameState, Player } from "../models/GameState";


export class SmartBeadsEngine {


    private state: GameState;


    constructor(boardSize: number = 7) {

        this.state = {

            board: Array(boardSize).fill(0),

            currentPlayer: "RED",

            moveCount: 0,

            winner: null,

            gameOver: false

        };

    }



    public getState(): GameState {

        return this.state;

    }



    public makeMove(position: number): boolean {


        if(this.state.gameOver) {
            return false;
        }


        if(position < 0 || position >= this.state.board.length) {
            return false;
        }


        if(this.state.board[position] !== 0) {
            return false;
        }



        this.state.board[position] =
            this.state.currentPlayer === "RED"
            ? 1
            : 2;



        this.state.moveCount++;



        this.switchPlayer();


        return true;

    }



    private switchPlayer(): void {


        this.state.currentPlayer =
            this.state.currentPlayer === "RED"
            ? "BLUE"
            : "RED";


    }


}