const API_KEY =
  '1e28ac634cbc8a0168de90e4f20922868054d2ec722f5d7d1c9995482c592849';

const tickersHandlers = new Map();
const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
);

const AGGREGATE_INDEX = '5';

socket.addEventListener('message', e => {
  const {
    TYPE: type,
    FROMSYMBOL: currency,
    PRICE: newPrice,
    } = JSON.parse(
      e.data
    );

    if (type !== AGGREGATE_INDEX || newPrice === undefined) {
      return;
    }

    const handlers = tickersHandlers.get(currency) ?? [];
    handlers.forEach(fn => fn(newPrice));
});

function sendToWebSocket(message) {
  const stringifiedMessage = JSON.stringify(message);

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(stringifiedMessage);
    return;
  }

  socket.addEventListener(
    'open',
    () => {
      socket.send(stringifiedMessage);
    },
    { once: true }
  );
}

function subscribeToTickerOnWs(ticker) {
  sendToWebSocket({
    action: 'SubAdd',
    subs: [`5~CCCAGG~${ticker}~USD`]  
  });
}

function unsubscribeFromTickerOnWs(ticker) {
  sendToWebSocket({
    action: 'SubRemove',
    subs: [`5~CCCAGG~${ticker}~USD`]
  });
}

export const subscribeToTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
  subscribeToTickerOnWs(ticker);
}; 

export const unsubscribeFromTicker = ticker => {
  tickersHandlers.delete(ticker);
  unsubscribeFromTickerOnWs(ticker);
};


window.tickers = tickersHandlers;

// TODO: refactor to use URLSearchParams
// export const loadTickers = tickers => 
//   fetch(
//     `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${tickersHandlers.join(
//       ','
//     )}&tsyms=USD&api_key=${API_KEY}`
//   )
//     .then(r => r.json())
//     .then(rawData =>
//       Object.fromEntries(
//         Object.entries(rawData).map(([key, value]) => [key, value.USD])
//       )
//     );

// window.tickers = tickersHandlers;