const express = require('express');
const bodyParser = require('body-parser')
const cors = require('cors')
const uuid = require('uuid');
const port = process.argv[2];
const app = express();
const rp = require('request-promise');
const Blockchain = require('./blockchain');

const bitcoin = new Blockchain();
const nodeAdress = uuid.v5.name


app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/', function (req, res) {
    res.send('hello world')
  })
app.get('/blockchain', function (req, res) {
    res.send(bitcoin)
})
app.post('/transaction', function (req, res) {
    const newTransaction = req.body;
    const blockIndex = bitcoin.addTransactionToPendingTransactions(newTransaction)
    res.send(`Saljem nazad amount ${blockIndex}`)
})
app.post('/transaction-broadcast',function(req,res){
    const newTransaction = bitcoin.createNewTransaction(req.body.amount,req.body.sender,req.body.recipient)
    bitcoin.addTransactionToPendingTransactions(newTransaction)

    const requestPromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl =>{
    const requestOptions = {
        uri: networkNodeUrl + '/transaction',
        method: 'POST',
        body: newTransaction,
        json: true
    }
    requestPromises.push(rp(requestOptions))
  })
  Promise.all(requestPromises).then(data=>{
      res.json({note: "Transaction created and broadcast successfully"})
  }).catch(data => {
      console.log('Error occured '+data);
  })
})
app.post('/register-block', function (req, res) {
    const newBlock = req.body.newBlock;
    const lastBlock = bitcoin.lastNewBlock();
    // if (lastBlock.hash===newBlock.previousBlockHash && newBlock.hash.substring(0,4) === '0000') {
        const spreadBlock = bitcoin.chain.push(newBlock);
        bitcoin.pendingTransactions = []
        res.send(`new ${spreadBlock} is shared`)
    // } else {
        console.log('block is not valid')
    // }

})
app.get('/mine', function (req, res) {
    const lastBlock = bitcoin.lastNewBlock();
    const previousBlockHash = lastBlock['hash'];
    const currentBlockData = {
        index: lastBlock['index']+1,
        transaction: bitcoin.pendingTransactions
    }
    const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData)
    const hash = bitcoin.hashBlock(previousBlockHash, currentBlockData, nonce)
    const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, hash)

    const regNodespromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl=>{
        console.log(networkNodeUrl)
       const requestOptions = {
           uri: networkNodeUrl + '/register-block',
           method: 'POST',
           body: { newBlock: newBlock },
           json: true
       }
       regNodespromises.push(rp(requestOptions))
    });
    Promise.all(regNodespromises).then(data => {
        const bulkRegisterOptions = {
            uri: bitcoin.currentNodeUrl + '/transaction-broadcast',
            method: 'POST',
            body: { amount:12.5, 
                    sender:"00",
                    recipier:nodeAdress 
                  },
            json: true
        }
        return rp(bulkRegisterOptions)
    }).then(data => {
        res.json({note: 'new block registered with network successfully'+data,
        block: newBlock})
    }).catch(data => {
        console.log("Error occured!!!!! \n "+data)
    })

})
app.post('/register-and-broadcast-node',function(req,res){
    const newNodeUrl = req.body.newNodeUrl
    //console.log(req.body.newNodeUrl)
    if (bitcoin.networkNodes.indexOf(newNodeUrl)==-1) {
        bitcoin.networkNodes.push(newNodeUrl)
        console.log('dodao NODE!!!')
    }else{
        console.log('Nije dodao NODE!!!')
    }
    const regNodespromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl=>{
        console.log(networkNodeUrl)
       const requestOptions = {
           uri: networkNodeUrl + '/register-node',
           method: 'POST',
           body: { newNodeUrl: newNodeUrl },
           json: true
       }
       regNodespromises.push(rp(requestOptions))
    });
    Promise.all(regNodespromises).then(data => {
        const bulkRegisterOptions = {
            uri: newNodeUrl + '/register-nodes-bulk',
            method: 'POST',
            body: { newNodeUrl: [...bitcoin.networkNodes,bitcoin.currentNodeUrl] },
            json: true
        }
        
        return rp(bulkRegisterOptions)
    }).then(data => {
        res.json({note: 'new node registered with network successfully'+data})
    }).catch(data => {
        console.log("Error occured!!!!! \n "+data)
    })
});
app.post('/register-node',function(req,res){
    const newNodeUrl = req.body.newNodeUrl
    console.log(req.body.newNodeUrl)
    const nodeNotAlreadyInside = bitcoin.networkNodes.indexOf(newNodeUrl)==-1
    const notSameNode = bitcoin.currentNodeUrl !== newNodeUrl
    if (nodeNotAlreadyInside && notSameNode) {
        bitcoin.networkNodes.push(newNodeUrl)
    }
    res.json({note: 'New node registered successfully'})
})
app.post('/register-nodes-bulk',function(req,res){
    const newNodeUrl = req.body.newNodeUrl
    newNodeUrl.forEach(data => {
        console.log(data)
        const nodeNotAlreadyInside = bitcoin.networkNodes.indexOf(data)==-1
        const notSameNode = bitcoin.currentNodeUrl !== data
        if (nodeNotAlreadyInside && notSameNode) {
            bitcoin.networkNodes.push(data)
        }
    })
    res.json({note: 'Bulk registered successfully'})
})
//It is listeneing PORT dinamically so to start one of the servers type: 
//npm start node_1, or node_2....
app.listen(port, function(){
    console.log('Server started on port '+port)
})
