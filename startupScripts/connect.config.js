module.exports = {
    apps : [
        {
            name        : "connectProd",
            script      : "../ecoServer.js",
            args : "port=4000 db=connectathon"
        },
        {
            name        : "connectTest",
            script      : "../ecoServer.js",
            args : "port=4001 db=connectathonTest"
        }]
}