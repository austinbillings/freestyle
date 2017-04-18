const zaq = require('zaq');
const freestyle = require('./freestyle');



let someStyles = `
  button, .imitation-button {
    background-color: #333;
    color: #fff;
    padding: 10px 30px;
    border: 1px solid #666;
  }

  article {
    display: inline-block;
  }

  h1.myClass, h2 {
    color: #8c42eb;
    margin: 20px auto;
  }
`;

zaq.info('cssToStyleList', freestyle.cssToStyleList(someStyles));