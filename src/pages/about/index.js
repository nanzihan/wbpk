import $ from 'jquery'
import _ from 'lodash'
import PopperJS from 'popper.js'

window.$ = $

$(document).ready(() => {
  let referenceEl = document.querySelector('#reference')
  let popperEl = document.querySelector('#popper')

  new PopperJS(referenceEl, popperEl, {
    placement: 'bottom'
  })

  $(popperEl).hide()
  $(referenceEl).click(() => {
    if ($(popperEl).is(':hidden')) {
      $(popperEl).show()
    } else {
      $(popperEl).hide()
    }
  })
  console.log(_.add(1, 1))
})
