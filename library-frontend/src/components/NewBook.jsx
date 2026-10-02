import { useState } from 'react'
import { gql } from '@apollo/client'
import { useMutation } from '@apollo/client/react'

const ADD_BOOK = gql`
  mutation AddBook(
    $title: String!
    $author: String!
    $published: Int!
    $genres: [String!]!
  ) {
    addBook(
      title: $title
      author: $author
      published: $published
      genres: $genres
    ) {
      title
      author
      published
      genres
    }
  }
`

const ALL_BOOKS = gql`
  query {
    allBooks {
      title
      author
      published
      genres
    }
  }
`

const ALL_AUTHORS = gql`
  query {
    allAuthors {
      name
      born
      bookCount
      id
    }
  }
`

const NewBook = (props) => {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [published, setPublished] = useState('')
  const [genre, setGenre] = useState('')
  const [genres, setGenres] = useState([])

  const [addBook] = useMutation(ADD_BOOK, {
    refetchQueries: [
      { query: ALL_BOOKS },
      { query: ALL_AUTHORS },
    ],
  })

  if (!props.show) {
    return null
  }

  const submit = async (event) => {
    event.preventDefault()

    try {
      await addBook({
        variables: {
          title,
          author,
          published: Number(published),
          genres,
        },
      })

      setTitle('')
      setAuthor('')
      setPublished('')
      setGenre('')
      setGenres([])
    } catch (error) {
      console.log(error)
    }
  }

  const addGenre = () => {
    if (genre.trim() !== '') {
      setGenres([...genres, genre.trim()])
      setGenre('')
    }
  }

  return (
    <div>
      <h2>add book</h2>

      <form onSubmit={submit}>
        <div>
          <label>
            title
            <input
              value={title}
              onChange={({ target }) => setTitle(target.value)}
            />
          </label>
        </div>

        <div>
          <label>
            author
            <input
              value={author}
              onChange={({ target }) => setAuthor(target.value)}
            />
          </label>
        </div>

        <div>
          <label>
            published
            <input
              type="number"
              value={published}
              onChange={({ target }) => setPublished(target.value)}
            />
          </label>
        </div>

        <div>
          <label>
            genre
            <input
              value={genre}
              onChange={({ target }) => setGenre(target.value)}
            />
            <button type="button" onClick={addGenre}>
              add genre
            </button>
          </label>
        </div>

        <div>
          <p>genres: {genres.join(', ')}</p>
        </div>

        <button type="submit">add book</button>
      </form>
    </div>
  )
}

export default NewBook