(function() {
    Colors = {};
    Colors.names = {
        turquoise: '#1abc9c',
        emerland: '#2ecc71',
        peterriver: '#3498db',
        amethyst: '#9b59b6',
        wetasphalt: '#34495e',
        greensea: '#16a085',
        nephritis: '#27ae60',
        belizehole: '#2980b9',
        wisteria: '#8e44ad',
        midnightblue: '#2c3e50',
        sunflower: '#f1c40f',
        carrot: '#e67e22',
        alizarin: '#e74c3c',
        orange: '#f39c12',
        pumpkin: '#d35400',
        pomegranate: '#c0392b',

    };
    Colors.random = function() {
        var result;
        var count = 0;
        for (var prop in this.names)
            if (Math.random() < 1 / ++count)
                result = prop;
        return {
            name: result,
            rgb: this.names[result]
        };
    };

})();