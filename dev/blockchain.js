const sha256 = require('sha256')
const uuid = require('uuid')
const currentNodeUrl = process.argv[3];
function Blockchain(){
   this.chain = [];
   this.currentNodeUrl = currentNodeUrl;
   this.networkNodes = [];
   this.pendingTransactions = [];
   this.createNewBlock(100, '0', '0');
}

Blockchain.prototype.createNewBlock = function(nonce,previousBlockHash, hash){
   const newBlock = {
       index: this.chain.length +1,
       timestamp: Date.now(),
       transactions: this.pendingTransactions,
       nonce: nonce,
       hash: hash,
       previousBlockHash: previousBlockHash
 
   }
   this.pendingTransactions = [];
   this.chain.push(newBlock);
   return newBlock;
}
Blockchain.prototype.lastNewBlock = function() {
    return this.chain[this.chain.length-1];
}
Blockchain.prototype.createNewTransaction = function(amount, sender, recipient){
    const newTransaction = {
        amount: amount,
        sender: sender,
        recipient: recipient,
        transactionId: uuid.v5.name
    }
    return newTransaction;
}
Blockchain.prototype.addTransactionToPendingTransactions = function(newTransaction){
this.pendingTransactions.push(newTransaction);
return this.lastNewBlock()['index']+1
}
Blockchain.prototype.hashTransaction = function(amount, sender, recipient){
    const dataString = JSON.stringify(amount) + sender.toString() + recipient.toString();
    const hash = sha256(dataString);
    return hash;
}
Blockchain.prototype.hashBlock = function(previousBlockHash, currentBlockData, nonce){
    const dataString = previousBlockHash + currentBlockData.toString() + JSON.stringify(nonce);
    const hash = sha256(dataString);
    return hash;
}
Blockchain.prototype.proofOfWork = function(previousBlockHash, currentBlockData){
  let nonce = 0;
  let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
  while (hash.substring(0,4) !== '0000') {
      nonce++;
      hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
  }
  return nonce;
}
module.exports = Blockchain;