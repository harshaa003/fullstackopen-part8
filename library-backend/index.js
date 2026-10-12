
require('dotenv').config()

const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const { ApolloServer } = require('@apollo/server')
const { startStandaloneServer } = require('@apollo/server/standalone')
const { GraphQLError } = require('graphql')

const Book = require('./models/book')
const Author = require('./models/author')
const User = require('./models/user')

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-me'
const LOGIN_PASSWORD = 'secret'

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

  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
    me: User
  }

  type Mutation {
    addBook(
      title: String!
      author: String!
      published: Int!
      genres: [String!]!
    ): Book!

    editAuthor(name: String!, setBornTo: Int!): Author

    createUser(
      username: String!
      favoriteGenre: String!
    ): User

    login(
      username: String!
      password: String!
    ): Token
  }
`

const resolvers = {
  Query: {
    bookCount: async () => Book.countDocuments({}),

    authorCount: async () => Author.countDocuments({}),

    allBooks: async (root, args) => {
      const filter = {}

      if (args.author) {
        const author = await Author.findOne({ name: args.author })

        if (!author) {
          return []
        }

        filter.author = author._id
      }

      if (args.genre) {
        filter.genres = args.genre
      }

      return Book.find(filter).populate('author')
    },

    allAuthors: async () => Author.find({}),

    me: (root, args, context) => context.currentUser,
  },

  Author: {
    bookCount: async (root) => {
      return Book.countDocuments({ author: root._id })
    },
  },

  Mutation: {
    createUser: async (root, args) => {
      const user = new User({
        username: args.username,
        favoriteGenre: args.favoriteGenre,
      })

      try {
        return await user.save()
      } catch (error) {
        if (error.name === 'ValidationError' || error.code === 11000) {
          throw new GraphQLError(
            error.code === 11000 ? 'Username already exists' : error.message,
            { extensions: { code: 'BAD_USER_INPUT' } }
          )
        }

        throw error
      }
    },

    login: async (root, args) => {
      const user = await User.findOne({ username: args.username })

      if (!user || args.password !== LOGIN_PASSWORD) {
        throw new GraphQLError('Invalid username or password', {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }

      const userForToken = {
        username: user.username,
        id: user._id.toString(),
      }

      return {
        value: jwt.sign(userForToken, JWT_SECRET, {
          expiresIn: '7d',
        }),
      }
    },

    addBook: async (root, args, context) => {
      if (!context.currentUser) {
        throw new GraphQLError('not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      try {
        let author = await Author.findOne({ name: args.author })

        if (!author) {
          author = new Author({ name: args.author })
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
      } catch (error) {
        if (error.name === 'ValidationError' || error.name === 'CastError') {
          throw new GraphQLError(error.message, {
            extensions: { code: 'BAD_USER_INPUT' },
          })
        }

        if (error.code === 11000) {
          throw new GraphQLError('Duplicate value', {
            extensions: { code: 'BAD_USER_INPUT' },
          })
        }

        throw error
      }
    },

    editAuthor: async (root, args, context) => {
      if (!context.currentUser) {
        throw new GraphQLError('not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      try {
        const author = await Author.findOne({ name: args.name })

        if (!author) {
          return null
        }

        author.born = args.setBornTo
        await author.save()
        return author
      } catch (error) {
        if (error.name === 'ValidationError' || error.name === 'CastError') {
          throw new GraphQLError(error.message, {
            extensions: { code: 'BAD_USER_INPUT' },
          })
        }

        throw error
      }
    },
  },
}

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')

    const server = new ApolloServer({ typeDefs, resolvers })

    const { url } = await startStandaloneServer(server, {
      listen: { port: 4000 },

      context: async ({ req }) => {
        const auth = req.headers.authorization

        if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
          return { currentUser: null }
        }

        try {
          const decodedToken = jwt.verify(auth.substring(7), JWT_SECRET)

          if (!decodedToken.id) {
            return { currentUser: null }
          }

          const currentUser = await User.findById(decodedToken.id)

          return { currentUser: currentUser || null }
        } catch (error) {
          console.log('Authentication failed:', error.message)
          return { currentUser: null }
        }
      },
    })

    console.log(`Server ready at ${url}`)
  } catch (error) {
    console.error('Error starting server:', error)
  }
}

start()
