// Amounts in satang. Free delivery is strictly above 1,500 THB after discounts.
export const SHIPPING_FEE=5000;
export const FREE_SHIPPING_ABOVE=150000;
export function shippingFor(subtotal){
 if(!Number.isSafeInteger(subtotal)||subtotal<0)throw new TypeError('INVALID_SUBTOTAL');
 return subtotal===0||subtotal>FREE_SHIPPING_ABOVE?0:SHIPPING_FEE;
}
