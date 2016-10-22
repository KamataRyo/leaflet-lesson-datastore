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

    files.forEach((file) => {
      if (file !== '.gitkeep') {
        fs.unlink(`${dest}/${file}`, (err) => {

          if (err) rejected(err)

          // count finished
          if ((counter += 1) === files.length) {
            resolved()
          }
        })
      }
    })
  })

})

const build = () => new Promise((resolved, rejected) => {

  fs.readdir(`${src}/`, (err, files) => {

    if (err) rejected(err)

    const results = []
    const aborted = []
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
          result.imageURL = `https://kamataryo.github.io/dest/${counter}.jpg`
          // file copy
          fs.createReadStream(`${src}/${file}`)
            .pipe(fs.createWriteStream(`${dest}/${counter}.jpg`))

          results.push(result)

        } else {
          aborted.push({file, reason: 'No GPS information.'})
        }

        // count finished
        if ((counter += 1) === files.length) {
          results.aborted = aborted
          // write result
          const ws = fs.createWriteStream(`${dest}/list.json`)
          ws.write(JSON.stringify(results))
          ws.on('close', () => {
            console.log(`generated '${dest}/list.json'.`)
            resolved()
          })
          ws.end()
        }
      })
    })
  })
})

clean().then(build())
