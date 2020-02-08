export const createWarning = name => `[PublicationFactory]: <${name}> - WARNING! 
You have created a publication without any validation at all. 
Consider this publication as insecure, since any argument is accepted. 
However, the functionality of the publication is not affected by this.`

export const onErrorDefault = (publicationName, error) => console.error(publicationName, error)

export const onWarningDefault = (...args) => console.warn.apply(null, args)
