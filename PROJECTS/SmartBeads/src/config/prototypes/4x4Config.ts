import { BoardConfiguration } from '../BoardConfig';
    
    export const FourFourConfig: BoardConfiguration = {
      boardType: 'rectangle',
      rows: 4,
      columns: 4,
      nodes: [
        { id: 'A', player: 'RED' }, { id: 'B', player: 'RED' },
        { id: 'C', player: 'RED' }, { id: 'D', player: 'RED' },
        { id: 'E', empty: true },
        { id: 'F', player: 'BLUE' }, { id: 'G', player: 'BLUE' },
        { id: 'H', player: 'BLUE' }, { id: 'I', player: 'BLUE' }
      ],
      startingPositions: {
        RED: ['A', 'B', 'C', 'D'],
        BLUE: ['F', 'G', 'H', 'I']
      },
      movementRules: [{ type: 'Sholo-style' }],
      captureRules: [{ type: 'Sholo-style' }]
    };