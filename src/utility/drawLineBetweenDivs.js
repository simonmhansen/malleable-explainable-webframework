/**
 * Takes two divs and returns values used to create a very thin div
 * which emulates a line between the two divs.
 * The line gores from div1's right side and middle height
 * to div2's left side and middle height.
 * So:  [div1] --- [div2]
 * @param {HTMLDivElement} div1 
 * @param {HTMLDivElement} div2 
 * @returns {{cx: number, cy: number, length: number, angle: number}} Values used to draw the line
 */
export function drawLineBetweenDivs(div1, div2) {
 let rect1 = div1.getBoundingClientRect();
 let rect2 = div2.getBoundingClientRect();
 
 /** Since we do position 'relative' the getBoundingClient Rect values of:
  * - top, bottom, left, right
  * all change based on camera position.
  * But height and width stay the same
  * 
  * The .css style elements of:
  * - style.left
  * - style.top
  * Also stay the same. So we can calculate x and y values accordingly
  */

 // Converting from "'value'px" to base 10 number 'value'
 let div1Left = parseInt(div1.style.left, 10)
 let div1Top = parseInt(div1.style.top, 10)
 let div2Left = parseInt(div2.style.left, 10)
 let div2Top = parseInt(div2.style.top, 10)

 let x1 = div1Left + rect1.width; // right border = left + width
 let y1 = div1Top + (rect1.height / 2); // middle of height = top + height/2
 let x2 = div2Left; // left border = left
 let y2 = div2Top + (rect2.height / 2); // middle of height = top + height/2

 let thickness = 1;

 let length = Math.sqrt((x2-x1)**2 + (y2-y1)**2)
 let angle = Math.atan2((y1-y2),(x1-x2))*(180/Math.PI);

 var cx = ((x1 + x2) / 2) - (length / 2);
 var cy = ((y1 + y2) / 2) - (thickness / 2);

 return {cx: cx, cy: cy, length: length, angle: angle}
}