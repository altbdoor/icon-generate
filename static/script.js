function getFontAwesomeJSON() {
    const version = '5f201aca'
    const url = `https://cdn.rawgit.com/simplesvg/icons/${version}/json/fa.json`

    return fetch(url).then((r) => {
        return r.json()
    })
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

            $(svg).children('path').removeAttr('fill')
            svg = $(svg).prop('outerHTML')

            // var xml = new XMLSerializer().serializeToString($('#output-canvas-icon > svg')[0]);
            // let x = 'data:image/svg+xml;base64,' + btoa(svg)
            // $('<img/>').attr('src', x).appendTo($('body'))
            // console.log(xml)
        }

        return svg
    })
}

function setCanvasFontAwesomeIcon(glyphName) {
    return getFontAwesomeSVG(glyphName).then((svg) => {
        if (svg) {
            $('#output-canvas-icon').html(svg)
        }
        else {
            alert(`Glyph "${glyphName}" not found!`)
        }
    })
}

function fixCanvasSize(reset=false) {
    const canvas = $('#output-canvas')
    let factor = 1

    if (!reset) {
        const canvasWidth = $(canvas).outerWidth()
        const canvasParentWidth = $(canvas).parent().width()
        factor = canvasParentWidth / canvasWidth
    }

    $(canvas).css('transform', `scale(${factor})`)
}

function fixIconPlacement(adjustTop=0, adjustLeft=0) {
    const canvas = $('#output-canvas')
    const icon = $('#output-canvas-icon')

    adjustTop += (($(canvas).outerHeight() - $(icon).outerHeight()) / 2)
    adjustLeft += (($(canvas).outerWidth() - $(icon).outerWidth()) / 2)

    $(icon).css({
        'margin-top': `${adjustTop}px`,
        'margin-left': `${adjustLeft}px`,
    })
}

function exportImage() {
    fixCanvasSize(reset=true)
    const canvasSize = parseInt($('#canvas-size').val())

    domtoimage.toPng($('#output-canvas')[0], {
        width: canvasSize,
        height: canvasSize,
    }).then(function (dataUrl) {
        window.open(dataUrl)
        fixCanvasSize()
    })
}

function generateIconImage() {
    const iconImg = $('#icon-img').data('svg')
    let promise = $.when()

    if (iconImg) {
        $('#output-canvas-icon').html(iconImg)
    }
    else {
        const iconGlyph = $('#icon-glyph').val()
        promise = setCanvasFontAwesomeIcon(iconGlyph)
    }

    return promise.then(() => {
        const canvasSize = parseInt($('#canvas-size').val())

        const iconBg = hexToRgb($('#icon-bg').val())
        const iconBgOpacity = $('#icon-bg-opacity').val()
        const iconFg = $('#icon-fg').val()
        const iconFgOpacity = $('#icon-fg-opacity').val()

        const iconRound = $('#icon-round').val()
        const iconScale = $('#icon-scale').val()
        const iconTop = $('#icon-top').val()
        const iconLeft = $('#icon-left').val()
        const iconRotate = $('#icon-rotate').val()

        $('#output-canvas').css({
            'width': `${canvasSize}px`,
            'height': `${canvasSize}px`,
            'border-radius': `${iconRound}px`,
        })
        fixCanvasSize()

        $('#output-canvas-background').css({
            'background-color': `rgba(${iconBg.r}, ${iconBg.g}, ${iconBg.b}, ${iconBgOpacity})`,
            'border-radius': `${iconRound}px`,
        })

        $('#output-canvas-icon').css({
            'transform': `scale(${iconScale}) rotate(${iconRotate}deg)`,
        }).find('path').attr({
            'fill': `#${iconFg}`,
            'fill-opacity': iconFgOpacity,
        })

        fixIconPlacement(parseInt(iconTop), parseInt(iconLeft))

        // let shadowFilter = ''
        // for (let i=0; i<10; i+=1) {
        //     let spread = 0

        //     if (i > 0) {
        //         spread = 1
        //     }

        //     shadowFilter += `drop-shadow(${i}px ${i}px ${spread}px #aaa) `
        // }
        // console.log(shadowFilter)
        // $('#output-canvas-icon svg').css({
        //     'filter': shadowFilter,
        // })
    })
}

// https://stackoverflow.com/a/5624139/6616962
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

$('#icon-img').on('change', () => {
    const elem = $('#icon-img')[0]

    if (elem.files && elem.files[0]) {
        const file = elem.files[0]
        const reader = new FileReader()

        reader.onload = function(e) {
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
    return generateIconImage()
}).on('reset', () => {
    $('#icon-img').trigger('custom-reset')
})

$('#generate-form-download').on('click', () => {
    $('#generate-form').triggerHandler('submit').then(() => {
        exportImage()
    })
})

getFontAwesomeJSON().then((r) => {
    $('#generate-form').trigger('submit')
    let choiceHtml = ''

    for (let key in r.icons) {
        choiceHtml += `<option value="${key}">`
    }

    $('#fontawesome-choice').append(choiceHtml)
})
