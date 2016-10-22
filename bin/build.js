const fs        = require('fs')
const ExifImage = require('exif').ExifImage

const dest = `${__dirname}/../dest`
const src  = `${__dirname}/../src`

const DMS2Decimal = ({GPSLatitude, GPSLongitude, GPSLatitudeRef, GPSLongitudeRef}) => {
  return {
    lat: (GPSLatitudeRef  === 'N' ? 1 : -1) *
         (GPSLatitude[0]  + GPSLatitude[1]  / 60 + GPSLatitude[2]  / 3600),
    lng: (GPSLongitudeRef === 'E' ? 1 : -1) *
         (GPSLongitude[0] + GPSLongitude[1] / 60 + GPSLongitude[2] / 3600)
  }
}

const clean = () => new Promise((resolved, rejected) => {
  // count up foreach end
  var counter = 0

  fs.readdir(`${dest}/`, (err, files) => {

    if (err) rejected(err)

    if (files.length === 1) {
      resolved()
    } else {
      files.forEach((file) => {
        if (file !== '.gitkeep') {
          fs.unlink(`${dest}/${file}`, (err) => {

            if (err) rejected(err)

            counter += 1
            // count finished
            if ((counter) === files.length - 1) {
              resolved()
            }
          })
        }
      })
    }
  })

})

const build = () => new Promise((resolved, rejected) => {

  const successed = []
  const aborted = []

  fs.readdir(`${src}/`, (err, files) => {

    if (err) rejected(err)

    var counter = 0

    files.forEach((file) => {
      new ExifImage({image: `${src}/${file}`}, (err, exif) => {

        if (err) rejected(err)

        const gpsAvailable =
          exif &&
          exif.gps &&
          exif.gps.GPSLatitude &&
          exif.gps.GPSLongitude &&
          exif.gps.GPSLatitudeRef &&
          exif.gps.GPSLongitudeRef

        if (gpsAvailable) {
          const result = DMS2Decimal(exif.gps)
          result.imageURL = `https://kamataryo.github.io/leaflet-lesson-datastore/dest/${counter}.jpg`
          // file copy
          fs.createReadStream(`${src}/${file}`)
            .pipe(fs.createWriteStream(`${dest}/${counter}.jpg`))

          successed.push(result)

        } else {
          aborted.push({file, reason: 'No GPS information.'})
        }

        counter += 1
        // count finished
        if (counter === files.length) {

          const ws1 = fs.createWriteStream(`${dest}/list.json`)
          ws1.write(JSON.stringify(successed))
          ws1.on('close', () => {
            console.log(`generated '${dest}/list.json'.`)
          })
          ws1.end()

          const ws2 = fs.createWriteStream(`${dest}/aborted.json`)
          ws2.write(JSON.stringify(aborted))
          ws2.on('close', () => {
            console.log(`generated '${dest}/aborted.json'.`)
          })
          ws2.end()
        }
      })
    })
  })
})


clean().then(build)
