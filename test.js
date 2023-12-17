function multiply(a, b) {
    return a * b;
}
function add(a, b) {
    return a + b;
}
function subtract(a, b) {
    return a - b;
}
function divide(a, b) {
    return a / b;
}
var num1 = 10;
var num2 = 5;
var result = divide(subtract(add(multiply(num1, num2), num1), num2), num1);
console.log("The result is: ".concat(result));
