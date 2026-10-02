import { gql } from '@apollo/client'
import { useMutation, useQuery } from '@apollo/client/react'
import { useState } from 'react'

const ALL_AUTHORS = gql`
  query {
    allAuthors {
      name
      born
      bookCount
    }
  }
`

const EDIT_AUTHOR = gql`
  mutation EditAuthor($name: String!, $setBornTo: Int!) {
    editAuthor(name: $name, setBornTo: $setBornTo) {
      name
      born
    }
  }
`

const Authors = (props) => {
  const [name, setName] = useState('')
  const [born, setBorn] = useState('')

  const result = useQuery(ALL_AUTHORS)

  const [editAuthor] = useMutation(EDIT_AUTHOR, {
    refetchQueries: [{ query: ALL_AUTHORS }],
  })

  if (!props.show) {
    return null
  }

  if (result.loading) {
    return <div>loading...</div>
  }

  if (result.error) {
    return <div>Error: {result.error.message}</div>
  }

  const authors = result.data.allAuthors

  const submit = async (event) => {
    event.preventDefault()

    if (!name || !born) {
      return
    }

    try {
      await editAuthor({
        variables: {
          name,
          setBornTo: Number(born),
        },
      })

      setName('')
      setBorn('')
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <div>
      <h2>authors</h2>

      <table>
        <tbody>
          <tr>
            <th></th>
            <th>born</th>
            <th>books</th>
          </tr>

          {authors.map((author) => (
            <tr key={author.name}>
              <td>{author.name}</td>
              <td>{author.born}</td>
              <td>{author.bookCount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Set birthyear</h3>

      <form onSubmit={submit}>
        <div>
          <label>
            name
            <select
              value={name}
              onChange={(event) => setName(event.target.value)}
            >
              <option value="">select author</option>

              {authors.map((author) => (
                <option key={author.name} value={author.name}>
                  {author.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <label>
            born
            <input
              type="number"
              value={born}
              onChange={(event) => setBorn(event.target.value)}
            />
          </label>
        </div>

        <button type="submit">update author</button>
      </form>
    </div>
  )
}

export default Authors