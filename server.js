import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/budget"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

// setup mangoose models

const Account = mongoose.model('Account', {
  name: String,
  saldo: Number
})

const Category = mongoose.model('Category', {
  name: String,
  description: String
})

const Expense = mongoose.model('Expense', {
  amount: Number,
  date: Date,
  description: String,
  category: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Category'
  },
  account: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Account'
  }
})

const Income = mongoose.model('Income', {
  amount: Number,
  date: Date,
  description: String,
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account'
  }
})

// ports

const port = process.env.PORT || 8080
const app = express()

// middlewares to enable cors and json body parsing

app.use(cors())
app.use(bodyParser.json())

// routes 

app.get('/', (_, res) => {
  res.send('Budget')
})

app.get('/accounts', async (_, res) => {
  res.json(await Account.find())
})

app.get('/categories', async (_, res) => {
  res.json(await Category.find())
})

app.get('/expenses', async (_, res) => {
  res.json(await Expense.find().populate('account').populate('category'))
})

app.get('/incomes', async (_, res) => {
  res.json(await Income.find().populate('account'))
})

// saving data

app.post('/accounts', async (req, res) => {
  try {
    const { name, saldo } = req.body
    const acc = new Account({ name: name, saldo: saldo })
    await acc.save()

    res.status(201).json(acc)

  } catch (err) {
    res
      .status(400)
      .json({ message: 'Could not create account', errors: err.errors })
  }
})

app.post('/categories', async (req, res) => {
  try {
    const { name, description } = req.body
    const cat = new Category({ name: name, description: description })
    await cat.save()

    res.status(201).json(cat)

  } catch (err) {
    res
      .status(400)
      .json({ message: 'Could not create category', errors: err.errors })
  }
})

app.post('/expenses', async (req, res) => {
  try {
    const { amount, date, description, category, account } = req.body
    const exp = new Expense({ amount: amount, date: date, description: description, category: category, account: account })
    await exp.save()

    await exp.populate('account').populate('category').execPopulate()

    await calculation(account, -amount)

    res.status(201).json(exp)

  } catch (err) {
    res
      .status(400)
      .json({ message: 'Could not add expense', errors: err.errors })
  } 
})

app.post('/incomes', async (req, res) => {
  try {
    const { amount, date, description, account } = req.body
    const exp = new Income({ amount: amount, date: date, description: description, account: account })
    await exp.save()
    await exp.populate('account').execPopulate()

    await calculation(account, amount)

    res.status(201).json(exp)

  } catch (err) {
    res
      .status(400)
      .json({ message: 'Could not add income', errors: err.errors })
  }
})

// recalculate saldo (accounts)

const calculation = async (accountId, amount) => {
  const accToC = await Account.findById(accountId)
  accToC.saldo = accToC.saldo + amount

  await accToC.save()
}

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
