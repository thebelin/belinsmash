/**
 * A visual interface for designing belinsmash levels
 */
$(document).ready(function () {
(function (d, config) {
  config = 
    {
      init:   config.init || null
    };

  // Run the init if it's a function
  if (typeof config.init === 'function') {
    config.init();
  }
}(document, {

	init: function() {
		console.log('init');
		// A jQuery DOM object used to contain the interface
		var $dom = $(document).find('#levelEditor'),

		columns = 18,

		rows = 20,

		targets = [],

		depths = {0:[],1:[],2:[]},

		targetSpec = {},

		targetHtml = '',

		currentDepth = 0,

		addTargets = function(targetSpec) {
			for (var row = 0; row < rows; row ++) {
				targetHtml += '<div class="targetRow">';
				for (var column = 0; column < columns; column ++) {
					targetHtml += '<div class="targetItem" data-row="' + row + '" data-column="' + column + '"></div>';
				}
				targetHtml += '</div>';
			}
			$dom.append(targetHtml);
		};

		// Add the target divs to the editor
		addTargets(targetSpec);

		// User is changing depth levels they are currently editing
		$dom.find('.depthLevel').click(function(e) {
			var $this = $dom.find(this);

			// Set the application depth tracker
			currentDepth = $this.val() * 1;

			// Redraw the level editor with the information from this depth
			$dom.find('.targetItem').attr('data-active', "0");

			// Fill the items which are set for the current depth
			for (var x = 0; x < depths[currentDepth].length; x ++) {
				$dom.find('.targetItem[data-column="' + depths[currentDepth][x].column + '"]' +
					'[data-row="' + depths[currentDepth][x].row + '"]').attr('data-active', '1');
			}
		})

		$dom.find('.targetItem').click(function(e) {
			var $this 		= $dom.find(this),
				isActive 	= $this.attr('data-active'),
				row 		= $this.attr('data-row'),
				column 		= $this.attr('data-column'),
				setting 	= 1;

			if (isActive === "1") {
				setting = 0;
				
				// Remove this item from the targets array
				for (var i = 0; i < targets.length; i++) {
					// if the current item in the targets array matches these settings,
					// remove it
					if (targets[i].row == row 
						&& targets[i].column == column 
						&& targets[i].depth  == currentDepth) {
						console.log('remove target', i);
						targets.splice(i, 1);
						break;
					}
				}

				// Remove this item from the depths array
				for (var i = 0; i < depths[currentDepth].length; i++) {
					// if the current item in the targets array matches these settings,
					// remove it
					console.log(
						'depths: %s, row %s column %s',
						JSON.stringify(depths[currentDepth][i]),
						row,
						column
					);

					if (depths[currentDepth][i].row == row
						&& depths[currentDepth][i].column == column) {
						console.log('remove depth:', i);
						depths[currentDepth].splice(i, 1);
						break;
					}
				}
				
			} else {
				var targetData = {
					row:    $this.data('row'),
					column: $this.data('column'),
					depth:  currentDepth
				};
				// Add this item to the targets array
				targets.push(targetData);
				// Add the item to the depths object array also
				depths[currentDepth].push(targetData);
			}
			$this.attr('data-active', setting);
			console.log(JSON.stringify(targets));
		});

	}

}));
});