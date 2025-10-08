var http = require('http')

http.createServer(function(req,res){
    res.write("Hello Sagar")
    res.write("HEyyyyyyy its me sagar")
    res.end()

}).listen(8080)