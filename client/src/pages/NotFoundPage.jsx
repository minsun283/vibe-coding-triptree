import { Link } from 'react-router-dom'
import './NotFoundPage.css'

function NotFoundPage() {
  return (
    <main className="not-found-page">
      <div className="not-found-page__inner">
        <h1 className="not-found-page__title">404</h1>
        <p className="not-found-page__message">요청하신 페이지를 찾을 수 없습니다.</p>
        <Link to="/" className="not-found-page__button">
          홈으로 돌아가기
        </Link>
      </div>
    </main>
  )
}

export default NotFoundPage
