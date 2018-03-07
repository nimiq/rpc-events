/**
 * Write test result to the document body
 * @param {string} description
 * @param {any} result
 * @param {any} expected
 */
function testResult(description, result, expected) {

    const div = document.createElement('div')

    if(result === expected) {
        div.style.color = 'green'
        result = ''
    } else {
        div.style.color = 'red'
        description += ': '
        console.log(result);
    }

    const label = document.createElement('label')
    label.textContent = description

    const span = document.createElement('span')
    span.textContent = `${result}`

    div.appendChild(label)
    div.appendChild(span)

    document.body.appendChild(div)
}