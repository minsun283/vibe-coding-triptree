function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <p className="footer__text">© {year} Shoping Mall. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
