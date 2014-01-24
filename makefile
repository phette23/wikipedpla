# I don't usually make makefiles. Don't laugh at me.

UGFLAGS=-c -m --screw-ie8

userscript:
	cat userscript-header.txt wikipedpla.js > userscript.js

iife:
	cat iife-header.txt wikipedpla.js iife-footer.txt > iife.js

min:
	uglifyjs $(UGFLAGS) -o wikipedpla.min.js wikipedpla.js

iife-min:
	cat iife-header.txt wikipedpla.js iife-footer.txt > iife.js && uglifyjs $(UGFLAGS) -o iife.min.js iife.js

clean:
	rm iife.js iife.min.js userscript.js wikipedpla.min.js
