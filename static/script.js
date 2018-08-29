function getFontAwesomeJSON() {
    const version = '5f201aca'
    const url = `https://cdn.rawgit.com/simplesvg/icons/${version}/json/fa.json`

    const defer = $.Deferred()

    const cacheKey = `fa-${version}`
    const cacheJson = localStorage.getItem(cacheKey)

    if (cacheJson) {
        defer.resolve(JSON.parse(cacheJson))
    }
    else {
        fetch(url).then((r) => {
            return r.text()
        }).then((ajaxData) => {
            localStorage.setItem(cacheKey, ajaxData)
            defer.resolve(JSON.parse(ajaxData))
        })
    }

    return defer.promise()
}

function getFontAwesomeSVG(glyphName) {
    return getFontAwesomeJSON().then((r) => {
        let icon = null
        let svg = null

        if (glyphName in r.icons) {
            icon = r.icons[glyphName]
        }

        if (icon) {
            svg = $(document.createElement('svg'))
            $(svg).html(icon.body).attr({
                'xmlns': 'http://www.w3.org/2000/svg',
                'width': (icon.width || r.width),
                'height': (icon.height || r.height),
            })

            svg = $(svg).prop('outerHTML')
        }

        return svg
    })
}

getFontAwesomeJSON().then((r) => {
    $('#generate-form').trigger('submit')
    let choiceHtml = ''

    for (let key in r.icons) {
        choiceHtml += `<option value="${key}">`
    }

    $('#fontawesome-choice').append(choiceHtml)
})

function generateCanvasImage (settings) {
    const outputCanvas = $('#output-canvas')[0]
    const outputCtx = outputCanvas.getContext('2d')
    outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height)

    const canvasSize = parseInt(settings.size)
    const canvasPadding = parseInt(settings.padding)

    outputCanvas.width = canvasSize
    outputCanvas.height = canvasSize

    outputCtx.globalAlpha = Number(settings.bg.alpha)
    if (outputCtx.globalAlpha > 0) {
        // roundrect seems to not work with X/Y
        outputCtx.translate(canvasPadding, canvasPadding)
        const roundRectSize = canvasSize - (canvasPadding * 2)
        roundRect(outputCtx, 0, 0, roundRectSize, roundRectSize, settings.bg.round)
        outputCtx.translate(canvasPadding * -1, canvasPadding * -1)

        outputCtx.globalCompositeOperation = 'source-over'
        outputCtx.fillStyle = `#${settings.bg.color}`
        outputCtx.fill()
    }

    const canvasParentWidth = $(outputCanvas).parent().width()
    const factor = canvasParentWidth / outputCanvas.width

    $(outputCanvas).css('transform', `scale(${factor})`)

    const scopedDefer = $.when()
    return scopedDefer.then(() => {
        const defer = $.Deferred()

        const hiddenContainer = $('#hidden-container')
        $(hiddenContainer).html(settings.svgStr)

        const svg = $(hiddenContainer).children('svg').first()
        $(svg).find('path').attr('fill', `#${settings.fg.color}`)

        // fix because firefox just dies when svg no dimension attributes
        if ((!$(svg).attr('width') || !$(svg).attr('height')) && $(svg).attr('viewBox')) {
            const viewboxAttr = $(svg).attr('viewBox').split(' ')
            $(svg).attr('width', viewboxAttr[2])
            $(svg).attr('height', viewboxAttr[3])
        }

        const svgXml = new XMLSerializer().serializeToString($(svg)[0])
        const svgB64 = 'data:image/svg+xml;base64,' + btoa(svgXml)

        const svgImg = new Image()
        svgImg.onload = function () {
            const canvas = document.createElement('canvas')
            const svgScale = Number(settings.fg.scale)
            const svgWidth = (svgImg.width * 2 * svgScale)
            const svgHeight = (svgImg.height * 2 * svgScale)

            const maxDimension = Math.max(svgWidth, svgHeight)
            canvas.width = maxDimension * 2
            canvas.height = maxDimension * 2

            const centerImgX = (canvas.width - svgWidth) / 2
            const centerImgY = (canvas.height - svgHeight) / 2

            const ctx = canvas.getContext('2d')
            const angle = parseInt(settings.fg.angle) * Math.PI / 180

            // https://stackoverflow.com/questions/3793397/html5-canvas-drawimage-with-at-an-angle
            ctx.translate(maxDimension + parseInt(settings.fg.adjustX), maxDimension + parseInt(settings.fg.adjustY))
            ctx.rotate(angle)

            const newSvgPosX = (svgWidth / 2 * -1)
            const newSvgPosY = (svgHeight / 2 * -1)

            ctx.drawImage(svgImg, newSvgPosX, newSvgPosY, svgWidth, svgHeight)
            // ctx.rotate(angle * -1)
            // ctx.translate(svgWidth * -1, svgHeight * -1)

            const pngImgSrc = canvas.toDataURL('image/png')
            defer.resolve(pngImgSrc)
        }
        svgImg.src = svgB64

        return defer.promise()

    }).then((pngImgSrc) => {
        const pngImg = new Image()
        pngImg.onload = function () {
            const resizePngWidth = pngImg.width / 2
            const resizePngHeight = pngImg.height / 2
            const centerImgX = (outputCanvas.width - resizePngWidth) / 2
            const centerImgY = (outputCanvas.height - resizePngHeight) / 2

            const shadowSingleCanvas = document.createElement('canvas')
            const shadowSingleCtx = shadowSingleCanvas.getContext('2d')
            shadowSingleCanvas.width = resizePngWidth
            shadowSingleCanvas.height = resizePngHeight

            // https://stackoverflow.com/questions/43447959/html5-canvasis-there-a-way-to-use-multiple-shadows-on-image
            shadowSingleCtx.globalCompositeOperation = 'source-over'
            shadowSingleCtx.fillStyle = `#${settings.shadow.color}`
            shadowSingleCtx.fillRect(0, 0, shadowSingleCanvas.width, shadowSingleCanvas.height)
            shadowSingleCtx.globalCompositeOperation = 'destination-in'
            shadowSingleCtx.drawImage(pngImg, 0, 0, resizePngWidth, resizePngHeight)

            const shadowFullCanvas = document.createElement('canvas')
            const shadowFullCtx = shadowFullCanvas.getContext('2d')
            shadowFullCanvas.width = outputCanvas.width
            shadowFullCanvas.height = outputCanvas.height

            // https://code.tutsplus.com/tutorials/creating-a-jquery-plugin-for-long-shadow-design--cms-28924
            const shadowAngle = parseInt(settings.shadow.angle) * Math.PI / 180
            const shadowCount = parseInt(settings.shadow.count)
            for (let i=0.5; i<shadowCount; i+=0.5) {
                const x = Math.round(i * Math.cos(shadowAngle))
                const y = Math.round(i * Math.sin(shadowAngle))

                shadowFullCtx.drawImage(shadowSingleCanvas, centerImgX + x, centerImgY + y)
            }

            let iconCompositeOperation = 'source-atop'
            if (Number(settings.bg.alpha) == 0) {
                iconCompositeOperation = 'source-over'
            }

            outputCtx.globalAlpha = Number(settings.shadow.alpha)
            outputCtx.globalCompositeOperation = iconCompositeOperation
            outputCtx.drawImage(shadowFullCanvas, 0, 0)

            outputCtx.globalAlpha = Number(settings.fg.alpha)
            outputCtx.globalCompositeOperation = iconCompositeOperation
            outputCtx.drawImage(pngImg, centerImgX, centerImgY, resizePngWidth, resizePngHeight)
        }
        pngImg.src = pngImgSrc
    })

}

$('#icon-img').on('change', () => {
    const elem = $('#icon-img')[0]

    if (elem.files && elem.files[0]) {
        const file = elem.files[0]
        const reader = new FileReader()

        reader.onload = function (e) {
            try {
                const parser = new DOMParser()
                const xmldoc = parser.parseFromString(e.target.result, 'text/xml')

                const svg = xmldoc.getElementsByTagName('svg')[0].outerHTML

                $(elem).data('svg', svg)
                $('#generate-form').trigger('submit')
            }
            catch (ex) {
                alert(`"${file.name}" is not a valid SVG/XML file!`)
                $(elem).trigger('custom-reset')
            }
        }
        reader.readAsText(file)

        $(elem).siblings('label').text(file.name)
    }
    else {
        $(elem).trigger('custom-reset')
    }

}).on('custom-reset', () => {
    $('#icon-img').data('svg', null).siblings('label').text('Choose file')
})

$('#icon-img-reset').on('click', () => {
    $('#icon-img').val(null).trigger('custom-reset')
    $('#generate-form').trigger('submit')
})

$('#generate-form').on('submit', (e) => {
    e.preventDefault()

    const iconImg = $('#icon-img').data('svg')
    const iconGlyph = $('#icon-glyph').val()

    const svgDefer = $.Deferred()

    if (iconImg) {
        svgDefer.resolve(iconImg)
    }
    else {
        getFontAwesomeSVG(iconGlyph).then((svgStr) => {
            if (svgStr) {
                svgDefer.resolve(svgStr)
            }
            else {
                alert(`Glyph "${iconGlyph}" not found!`)
                svgDefer.reject()
            }
        })
    }

    return svgDefer.then((svgStr) => {
        const canvasSetting = {
            svgStr: svgStr,
            size: $('#canvas-size').val(),
            padding: $('#canvas-padding').val(),
            bg: {
                color: $('#icon-bg-color').val(),
                alpha: $('#icon-bg-alpha').val(),
                round: $('#icon-bg-round').val(),
            },
            fg: {
                color: $('#icon-fg-color').val(),
                alpha: $('#icon-fg-alpha').val(),
                scale: $('#icon-fg-scale').val(),
                angle: $('#icon-fg-rotate').val(),
                adjustX: $('#icon-fg-left').val(),
                adjustY: $('#icon-fg-top').val(),
            },
            shadow: {
                color: $('#icon-shadow-color').val(),
                alpha: $('#icon-shadow-alpha').val(),
                angle: $('#icon-shadow-rotate').val(),
                count: $('#icon-shadow-count').val(),
            },
        }

        return generateCanvasImage(canvasSetting)
    })

}).on('reset', () => {
    $('#icon-img').trigger('custom-reset')
})

$('#generate-form-download').on('click', () => {
    const outputCanvas = $('#output-canvas')[0]
    const pngImgSrc = outputCanvas.toDataURL('image/png')

    const link = $(document.createElement('a'))

    $(link).attr({
        href: pngImgSrc,
        download: 'export.png',
    }).addClass('d-none').appendTo(document.body)

    $(link)[0].click()
    $(link).remove()
})

// https://stackoverflow.com/a/7838871/6616962
function roundRect (ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y,   x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x,   y+h, r);
    ctx.arcTo(x,   y+h, x,   y,   r);
    ctx.arcTo(x,   y,   x+w, y,   r);
    ctx.closePath();
}
