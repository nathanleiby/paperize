import store from '../store'

const getLocalStorage = () => localStorage

const getCachedImage = (md5) => {
  return getLocalStorage().getItem(md5)
}

const setCachedImage = (md5, content) => {
  try {
    getLocalStorage().setItem(md5, content)
  } catch(error) {
    if(error.code == 22) {
      console.warn("Failed to cache image: Local Storage Image Cache is full.")
    } else {
      throw error
    }
  }
}

const getImageById = function(imageId) {
  return new Promise((resolve, reject) => {
    // lookup image in index
    const imageRecord = store.getters.findImage(imageId)

    if(imageRecord) {
      resolve(imageRecord)
    } else {
      reject(new Error(`No image in index with ${imageId}`))

      // // not there? request and index
      // return store.dispatch("googleGetRecord", imageId).then(
      //   (imageRecord) => {
      //     // TODO: store record in index
      //     resolve(imageRecord)
      //   }
      // )
    }
  }).then(getImageByRecord)
}

const getImageByRecord = function({ id, md5, mimeType }) {
  return new Promise((resolve) => {
    let imageDataURL = getCachedImage(md5)

    if(imageDataURL) {
      resolve(getImageWithSrc(imageDataURL))
    } else {
      return store.dispatch("googleDownloadFile", id).then((imageData) => {
        const dataURL = `data:${mimeType};base64,${btoa(imageData)}`
        setCachedImage(md5, dataURL)
        resolve(getImageWithSrc(dataURL))
      })
    }
  })
}

const getImageByName = function(name) {
  return Promise.try(() => {
    const imageRecord = store.getters.findImageByName(name)

    if(!imageRecord) {
      throw new Error(`No image found with name: ${name}`)
    }

    return getImageByRecord(imageRecord)
  })
}

const getImageWithSrc = function(imageSource) {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = function() {
      resolve(image)
    }
    image.src = imageSource
  })
}

export { getImageById, getImageByName }