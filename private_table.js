require('dotenv').config()
const fs = require('fs')
const { BigNumber, providers, Wallet, Contract, utils } = require('ethers')

const { INFURA_API_KEY, WALLET_PRIVATE_KEY } = process.env
if (!INFURA_API_KEY || !WALLET_PRIVATE_KEY) {
  throw new Error('Missing .env values')
}

const CONTRACT = {
  abi: JSON.parse(fs.readFileSync('abi.json', 'utf8')),
  address: '0x99027c41f74b38862f53bda999881d8389fc6a92',
  network: 'mainnet',
}

////////////////////////
////////////////////////
////////////////////////

const provider = new providers.InfuraProvider('mainnet', INFURA_API_KEY)

const wallet = new Wallet(WALLET_PRIVATE_KEY, provider)

const contract = new Contract(CONTRACT.address, CONTRACT.abi, wallet)

console.log('Watching...')

//////////////////////////
//////////////////////////
//////////////////////////

async function getIsBarOpen() {
  return await contract.barIsOpen()
}

async function getIsBarOnlyFins() {
  return await contract.onlyFins()
}

async function getBalanceOfDrink(accountAddress, drinkId) {
  return await contract.balanceOf(accountAddress, drinkId)
}

async function getCurrentRoundDrinkId() {
  const roundDuration = 15 // blocks
  const currentRound = await contract.currentRound()
  return BigNumber.from(roundDuration).sub(currentRound.div(5)) // same formula as _drinkToMint on contract
}

async function mintDrink() {
  const tx = await contract.mint('0x0000000000000000000000000000000000000000', {
    value: utils.parseEther('0.0001'),
  })

  return tx
}

//////////////////////////
//////////////////////////
//////////////////////////

// Every 10 seconds
// Check if bar open.
// Check which round we are on.
// Check if we've minted that drink yet.
// if not, mint it.

let timer = setInterval(async () => {
  const isBarOpen = await getIsBarOpen()
  const isBarOnlyFins = await getIsBarOnlyFins()

  if (!isBarOpen || !isBarOnlyFins) {
    console.log('Bar is closed!')
    clearInterval(timer)
    return
  }

  const currentDrinkId = await getCurrentRoundDrinkId()
  const hasMintedDrink = (
    await getBalanceOfDrink(wallet.address, currentDrinkId.toNumber())
  ).gt(0)

  if (hasMintedDrink) {
    console.log(`Already minted drink ${currentDrinkId.toString()}`)
    return
  }

  console.log(`Minting drink ${currentDrinkId.toNumber()}...`)
  const tx = await mintDrink()
  console.log(`Transaction Sent : ${tx.hash}`)
  // wait for transaction to be confrimed
  tx.wait().then((receipt) => {
    console.log(
      `Transaction ${tx.hash} confirmed in block ${receipt.blockNumber}!`,
    )
  })
}, 10000)
