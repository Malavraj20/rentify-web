import { useNavigate } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Button } from '../components/ui/Button'

const NotFoundPage = () => {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-14 text-center sm:px-6">
        <p className="font-display text-6xl font-bold tracking-tight text-rentify-purpleLight">
          404
        </p>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-rentify-navy sm:text-3xl">
          Page not found
        </h1>
        <p className="mx-auto mt-3 max-w-md text-rentify-grayMuted">
          The page you are looking for does not exist or may have been moved.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button onClick={() => navigate(-1)}>Go back</Button>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Return home
          </Button>
        </div>
      </main>
    </div>
  )
}

export default NotFoundPage
