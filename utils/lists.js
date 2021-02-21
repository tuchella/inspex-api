exports.comparing = function(mapper) {
    return function(a,b) {
        const va = mapper(a);
        const vb = mapper(b); 

        if ( va < vb ){
            return -1;
        } else if ( va > vb ){
            return 1;
        } else {    
            return 0;
        }
    }
}

exports.rmdups = l => [...new Set(l)]