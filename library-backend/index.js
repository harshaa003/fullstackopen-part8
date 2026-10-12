
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
    bookCount: async () => {
      return await Book.countDocuments({})
    },

    authorCount: async () => {
      return await Author.countDocuments({})
    },

    allBooks: async (root, args) => {
      const filter = {}

      if (args.author) {
        const author = await Author.findOne({
          name: args.author,
        })

        if (!author) {
          return []
        }

        filter.author = author._id
      }

      if (args.genre) {
        filter.genres = args.genre
      }

      return await Book.find(filter).populate('author')
    },

    allAuthors: async () => {
      return await Author.find({})
    },
  },

  Author: {
    bookCount: async (root) => {
      return await Book.countDocuments({
        author: root._id,
      })
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

      return await book.populate('author')
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

      return author
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
    console.error('Error starting server:', error)
  }
}

start()
