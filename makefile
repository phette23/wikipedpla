# I don't usually make makefiles. Don't laugh at me.

UGFLAGS=-c unused=false -m --screw-ie8

all: userscript iife min iife-min

userscript:
	cat userscript-header.txt wikipedpla.js > userscript.js

iife:
	cat iife-header.txt wikipedpla.js iife-footer.txt > iife.js

min:
	uglifyjs $(UGFLAGS) -o wikipedpla.min.js wikipedpla.js

iife-min: iife
	uglifyjs $(UGFLAGS) -o iife.min.js iife.js

clean:
	rm iife.js iife.min.js userscript.js wikipedpla.min.js

hint:
	jshint wikipedpla.js

push:
	git stash -q && make && git commit -am 'ran `make push`' && git push && git stash apply -q
