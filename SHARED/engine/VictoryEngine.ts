/** 
        * Checks for win conditions at the end of each turn.
        */
       export interface VictoryEngine {
         checkForVictory(gameState: any): { victory: boolean, winner: any | null };
       }