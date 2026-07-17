import { HOME_VIDEOS } from '@/constants/homeData'

function HomeVideoGallery() {
  return (
    <section className="home-videos" aria-label="찜해둔 여행지 영상">
      <div className="home-container">
        <h2 className="home-videos__heading">찜해둔 여행지 영상으로 확인하세요!</h2>

        <div className="home-videos__grid">
          {HOME_VIDEOS.map((video) => (
            <article key={video.id} className="home-videos__card">
              <div className="home-videos__player">
                <iframe
                  src={video.embedUrl}
                  title={video.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>

              <h3 className="home-videos__title">
                <a href={video.url} target="_blank" rel="noopener noreferrer">
                  {video.title}
                </a>
              </h3>
              <p className="home-videos__description">{video.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HomeVideoGallery
