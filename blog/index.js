// change all image URLs from local paths to the Google Storage bucket path
document.querySelectorAll("img").forEach(image => {
  const name = image.src.split("/").pop()
  image.src = "https://storage.googleapis.com/gcs-m-public/blog/" + name
})
