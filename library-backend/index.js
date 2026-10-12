
require('dotenv').config()
const mongoose = require('mongoose')

const Book = require('./models/book')
const Author = require('./models/author')

const { ApolloServer } = require('@apollo/server')
const { startStandaloneServer } = require('@apollo/server/standalone')

const typeDefs = `
  type Book {
    title: String!
    published: Int!
    author: Author!
    genres: [String!]!
    id: ID!
  }

  type Author {
    name: String!
    born: Int
    bookCount: Int!
    id: ID!
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
  }

  type Mutation {
    addBook(
      title: String!
      author: String!
      published: Int!
      genres: [String!]!
    ): Book!

    editAuthor(name: String!, setBornTo: Int!): Author
  }
`

const resolvers = {
  Query: {
    bookCount: async () => Book.countDocuments(),

    authorCount: async () => Author.countDocuments(),

    allBooks: async () => {
      return Book.find({}).populate('author')
    },

    allAuthors: async () => {
      const authors = await Author.find({})

      return Promise.all(
        authors.map(async (author) => ({
          name: author.name,
          born: author.born,
          id: author.id,
          bookCount: await Book.countDocuments({
            author: author._id,
          }),
        }))
      )
    },
  },

  Mutation: {
    addBook: async (root, args) => {
      let author = await Author.findOne({
        name: args.author,
      })

      if (!author) {
        author = new Author({
          name: args.author,
        })

        await author.save()
      }

      const book = new Book({
        title: args.title,
        published: args.published,
        author: author._id,
        genres: args.genres,
      })

      await book.save()

      return book.populate('author')
    },

    editAuthor: async (root, args) => {
      const author = await Author.findOne({
        name: args.name,
      })

      if (!author) {
        return null
      }

      author.born = args.setBornTo
      await author.save()

      return {
        name: author.name,
        born: author.born,
        id: author.id,
        bookCount: await Book.countDocuments({
          author: author._id,
        }),
      }
    },
  },
}

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('connected to MongoDB')

    const server = new ApolloServer({
      typeDefs,
      resolvers,
    })

    const { url } = await startStandaloneServer(server, {
      listen: { port: 4000 },
    })

    console.log(`Server ready at ${url}`)
  } catch (error) {
    console.error('Error starting server:', error.message)
  }
}

start()
