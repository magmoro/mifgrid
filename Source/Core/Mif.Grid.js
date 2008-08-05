if(!Mif) var Mif={};

var Mif.Grid=new Class({
	
	Implements: [Options, Events],
	
	options: {
		width:40,
		
		initialize: function(){
			this.keyNav();
			this.initResizing();
		}
		/*,onCheck: $empty,
		,onUncheck:$empty*/
	},
	
	initialize: function(options){
		this.setOptions(options);
		$extend(this,{
			id: 0,
			cols: {},
			rows: {},
			order: {
				cols: [],
				rows: []
			},
			checked: [],
			current: false
		});
		this.setLayouts();
		this.setLayoutsPosition();
		
		this.addEmptyCell();
		this.addTopRow();
		this.addMain();
		
		this.drawTopRow();
		this.drawMain();
		this.drawLeftCol();
		
		this.setWidth();
		this.setLayoutsPosition();
		
		this.syncScroll();
		
		this.initClick();
		this.initSelection();
		this.initEditing();
	},
	
	uid: function(){
		return this.id++;
	},
	
	setLayouts: function(){
		this.wrapper=new Element('div',{'class':'grid'}).injectInside(this.options.container);
		this.empty=new Element('div',{'class':'empty'}).injectInside(this.wrapper).unselect();
		this.topRow=new Element('div',{'class':'top-row'}).injectInside(this.wrapper).unselect();
		this.leftCol=new Element('div',{'class':'left-col'}).injectInside(this.wrapper).unselect();
		this.main=new Element('div',{'class':'main', 'tabindex':1,'hideFocus':'true'}).injectInside(this.wrapper).unselect();
	},
	
	setLayoutsPosition: function(){
		this.main.setStyles({
			width: this.wrapper.offsetWidth-26,
			height: this.wrapper.offsetHeight-18 
		});
		this.leftCol.setStyle('height',this.main.clientHeight);
		this.topRow.setStyle('width',this.main.clientWidth);
	},
	
	addSides: function(sides){
		var result=[];
		sides=sides||['left','top','right','bottom','lt','rt','lb','rb'];
		sides.each(function(side){
			result.push('<div class="',side,'"></div>');
		});
		return result.join('');
	},
	
	addEmptyCell: function(){
		this.empty.innerHTML='<div class="row border">'+this.addSides()+'</div>';
	},
	
	addTopRow: function(){
		this.options.header.each(function(item,i){
			var name=item.name||item.value;
			item.width=item.width||this.options.width;
			item.type=item.type||'text';
			this.cols[name]=item;
			this.order.cols.push(name);
		}, this);
	},
	
	drawTopRow: function(){
		var result=['<div class="row border">'];
		this.order.cols.each(function(colId,i){
			result.push('<div class="cell ',colId,'" colid="',colId,'">',this.addSides(),'<div class="content"><span>',this.cols[colId].value,'</span></div></div>');
		}, this);
		result.push('</div>');
		this.topRow.innerHTML=result.join('');
	},
	
	addMain: function(){
		this.options.rows.each(function(row){
			var rowId='row'+this.uid();
			this.rows[rowId]={};
			this.order.rows.push(rowId);
			row.each(function(cell, i){
				var col=this.order.cols[i];
				this.rows[rowId][col]= $defined(cell.value) ? {value: cell.value, saveValue: cell.value} : {value:''};
			}, this);
		}, this);
		this.addLastRow();
	},
	
	drawMain: function(){
		var result=[];
		this.order.rows.each(function(rowId){
			result.push('<div class="row ',rowId,'">');
			this.order.cols.each(function(colId, i){
				var cell={row:rowId,col:colId};
				var content=this.getVisibleContent(cell);
				var error=this.getProperty(cell, 'error')||'';
				result.push('<div class="cell ',error,' ',this.order.cols[i],'" colid="',this.order.cols[i],'">',this.addSides(['right','bottom']),
				'<div class="content">',content,'</div></div>');
			}, this);
			result.push('</div>');
		}, this);
		this.main.innerHTML=result.join('');
	},
	
	addLastRow: function(){
		var rowId='row'+this.uid();
		this.rows[rowId]={};
		this.order.rows.push(rowId);
		this.order.cols.each(function(colId){
			var value=this.cols[colId].defaultValue||'';
			this.rows[rowId][colId]={value: value, editValue: value};
		}, this);
	},
	
	drawLeftCol: function(){
		var result=[];
		var rows=this.order.rows;
		for(var i=0,l=rows.length;i<l-1;i++){
			result.push('<div class="row border ',rows[i],'"><div class="cell unchecked">',this.addSides(),'</div></div>');
		}
		result.push('<div class="row border ',rows[l-1],'"><div class="cell add">',this.addSides(),'</div></div>');
		this.leftCol.innerHTML=result.join('');
	},
	
	reDraw: function(){
		this.drawMain();
		this.drawLeftCol();
		this.setLayoutsPosition();
	},
	
	removeRows: function(){
		var rows=[];
		this.checked.each(function(row){
			rows.push(this.rows[row]);
			delete this.rows[row];
			this.order.rows.erase(row);
		}, this);
		this.reDraw();
		this.fireEvent('onRemove',[rows]);
	},
	
	syncScroll: function(){
		this.main.addEvent('scroll',function(){
			this.leftCol.scrollTop=this.main.scrollTop;
			this.topRow.scrollLeft=this.main.scrollLeft;
		}.bind(this));
	},
	
	getEl: function(cell){
		return this.wrapper.getElement('.'+cell.row+' .'+cell.col);
	},
	
	getVisibleContent: function(cell){
		var colId=cell.col, rowId=cell.row;
		var value=$pick(this.getProperty(cell, 'editValue'),this.getProperty(cell, 'saveValue'));
		var content=value||'';
		var type=this.cols[colId].type;
		if(!type) type='text';
		switch(type){
			case 'text':
			case 'prefix': return '<span>'+content+'</span>';
			case 'password': return (value!=undefined) 
			? 
				'<span>'+'*'.repeat(content.length)+'</span>' 
			: 
				'<span class="pass">change password</span>';
			case 'checkbox': return '<div class="mif-grid-checkbox"><input type="checkbox" '+(value ? 'checked="checked"' : '') + '"/></div>'
		}
	},
	
	setVisibleContent: function(cell){
		this.getEl(cell).getElement('.content').innerHTML=this.getVisibleContent(cell);
	},
	
	setProperty: function(cell, property, value){
		this.rows[cell.row][cell.col][property]=value;
	},
	
	getProperty: function(cell, property){
		return this.rows[cell.row][cell.col][property];
	},
	
	removeProperty: function(cell, property){
		delete this.rows[cell.row][cell.col][property];
	},
	
	getType: function(cell){
		return this.cols[cell.col].type;
	},
	
	getPrefix: function(cell){
		return this.cols[cell.col].prefix;
	},
	
	setWidth: function(){
		var totalWidth=0;
		this.order.cols.each(function(col, i){
			var width=this.cols[col].width;
			document.setStyles2Class({
				width: width+'px',
				left:totalWidth+'px'
			}, '.grid .'+col);
			totalWidth+=width;
		}, this);
		document.setStyles2Class({
			width: totalWidth+'px'
		}, '.grid .row');
	},
	
	initClick: function(){
		this.wrapper.addEvent('click',function(event){
			var target=$(event.target);
			
			var cellEl=target.getAncestorOrSelf('.cell');
			if(!cellEl) return;
			var colId=cellEl.getAttribute('colid');
			var col=this.order.cols.indexOf(colId);
			
			var rowEl=cellEl.getAncestorOrSelf('.row');
			var rowId=(/row[0-9]+/.exec(rowEl.className));
			rowId=rowId ? rowId[0] : null;
			var row=this.order.rows.indexOf(rowId);
			
			if(row==-1){
				if(col==-1) return;
				this.sort(colId, !this.cols[colId].direction);
				return;
			}
			if(col==-1){
				this.check(rowId); 
				return;
			};
			if(this.current && this.current.row==rowId && this.current.col==colId){
				if(this.state=='edited') return;
				this.editStart();
				return;
			}
			this.current={
				row: rowId,
				col: colId
			}
			this.select();
		}.bind(this));
	},
	
	initSelection: function(){
		this.selector=new Element('div',{'class':'selector'}).setStyle('position','absolute')
		.injectInside(this.main);
	},
	
	select: function(current){
		if(current) this.current=current;
		this.fireEvent('onBeforeSelect',[this.current]);
		this.main.focus();
		this.state='selected';
		this.setSelectorPos();
		//if(this.selected) this.rows[0].cells[this.selected.col].el.removeClass('selected');

		//this.rows[0].cells[this.current.col].el.addClass('selected');
		this.fireEvent('onSelect',[this.current]);
	},
	
	setSelectorPos: function(){
		var coords=this.getSize(this.current);
		this.selector.setStyles({
			width: coords.width-4,
			height: coords.height-4,
			left:0,
			top:0,
			border: 'solid 2px black'
		}).injectInside(this.getEl(this.current));
	},
	
	unselect: function(){
		this.selector.setStyles({
			width: 0,
			height: 0,
			border: 'none'
		});
		//this.rows[0].cells[this.selected.col].el.removeClass('selected');
		this.state=null;
	},
	
	check: function(row){
		var cell=this.leftCol.getElement('.'+row).getFirst();
		var checked=cell.hasClass('checked');
		if(!checked){
			this.checked.push(row);
			cell.addClass('checked').removeClass('unchecked');
			this.fireEvent('onCheck',[row]);
		}else{
			this.checked.erase(row);
			cell.addClass('unchecked').removeClass('checked');
			this.fireEvent('onUncheck',[row]);
		}
	},
	
	sort: function(col, direction){
		var last=this.order.rows.pop();
		this.cols[col].direction=direction;
		this.order.rows.sort(function(a, b){
			var sign=direction ? 1 : -1;
			return this.rows[a][col].value>=this.rows[b][col].value ? sign : -sign;
		}.bind(this));
		this.order.rows.push(last);
		this.drawMain();
		this.drawLeftCol();
	},
	
	getSize: function(cell){
		return {
			width: this.cols[cell.col].width,
			height: 18
		}
	},
	
	initEditing: function(){
		this.editors={};
		$each(this.cols, function(col){
			var type=col.type;
			if(!type) return;
			if(this.editors[type]) return;
			this.setEditor(col);
		}, this);
		if(!this.editors.text) this.setEditor('text');
		this.tips=new Tips({
			className: 'grid-tip'
		});
		this.addEvent('onBeforeSelect',function(cell){
			this.editEnd();
			if(this.editCell && this.current.row!=this.editCell.row){
				var row={
					id: this.editCell.row,
					structure: this.rows[this.editCell.row]
				};
				this.fireEvent('onRowChange',row);
				this.editCell=null;
			}
		}.bind(this));
		
	},
	
	setEditor: function(col){
		var type=col.type;
		if(type=='text'||type=='password'){
			var element=new Element('input',{type:type,'class':'grid-editor'})
			.addEvent('focus',function(){this.select()});
			this.editors[type]={
				element: element
			}
		}
		if(type=='prefix'){
			var prefixer=new Prefixer({
				prefix: col.prefix,
				'class': 'prefixer',
				'styles':{
					border:'none',
					width:0,
					height:0,
					overflow:'hidden',
					display: 'none'
				}
			});
			var element=prefixer.element;
			element.getElement('input').addEvent('focus',function(){this.select()});
			this.editors[type]={
				element: element,
				prefixer: prefixer
			};
			
		}
	},
	
	setEditorPos: function(){
		var type=this.getType(this.current);
		var coords=this.getSize(this.current);
		width=type=='prefix' ? coords.width-2 : coords.width-5;
		this.editor.element.setStyles({
			width: width,
			height: coords.height-2,
			left: 0,
			top: 0,
			border: 'solid 1px black',
			display: 'block'
		}).injectInside(this.getEl(this.current));
		if(this.getType(this.current)=='prefix'){
			this.editor.prefixer.position();
		}
	},
	
	setEditorValue: function(){
		var content=this.getProperty(this.current, 'value');
		switch(this.getType(this.current)){
			case 'text':
			case 'password': this.editor.element.set('value',content); break;
			case 'prefix': this.editor.element.getElement('input').set('value',content.substring(this.getPrefix(this.current).length,
			content.length));break;
		};
		return this;
	},
	
	getEditorValue: function(cell){
		switch(this.getType(cell)){
			case 'text':
			case 'password': return this.editor.element.value;
			case 'prefix': return this.getPrefix(cell)+this.editor.element.getElement('input').value;
		};
	},
	
	setEditorFocus: function(){
		this.getType(this.current)=='prefix' ? this.editor.element.getElement('input').focus() : this.editor.element.focus();
		return this;
	},
	
	editStart: function(){
		this.unselect();
		this.state='edited';
		this.editCell=$unlink(this.current);
		//this.rows[0].cells[this.current.col].el.addClass('selected');
		if(this.current.row==this.order.rows.getLast()){
			this.addLastRow();
			this.reDraw();
		}
		type=this.cols[this.current.col].type||'text';
		this.editor=this.editors[type];
		this.setEditorPos();
		this.setEditorValue();
		this.setEditorFocus.delay(100, this);
		
	},
	
	editEnd: function(){
		var cell=this.editCell;
		if(!cell) return;
		this.state=null;
		this.editor.element.setStyles({
			width:0,
			height:0,
			border:'none'
		});
		//this.rows[0].cells[this.current.col].el.removeClass('selected');
		var value=this.getEditorValue(cell);
		this.setProperty(cell, 'value', value);
		this.setProperty(cell, 'editValue', value);
		this.setVisibleContent(cell);
		var colId=cell.col;
		var rowId=cell.row;
		this.checkError(cell);
		this.fireEvent('onEditEnd',[cell, value]);
	},
	
	checkError: function(cell){
		var colId=cell.col;
		var rowId=cell.row;
		var check=this.cols[colId].check;
		if(!check) return;
		var value=this.getProperty(cell, 'value');
		var el=this.getEl(cell);
		if(!check(value)){
			el.addClass('error');
			el.set('title','error').set('rel',this.cols[colId].error);
			this.tips.attach(el);
			this.setProperty(cell, 'error', 'error');
		}else{
			if(!el.hasClass('error')) return;
			this.tips.detach(el);
			el.removeClass('error').erase('title').erase('rel');
			this.removeProperty(cell, 'error');
		}
	},
	
	editCancel: function(){
		if(this.state!='edited') return;
		this.state=null;
		this.editor.element.setStyles({
			width:0,
			height:0,
			border:'none'
		});
		//this.rows[0].cells[this.current.col].el.removeClass('selected');
	},
	
	saveRow: function(rowId){
		$each(this.rows[rowId], function(cell){
			if(cell.editValue){
				cell.saveValue=cell.editValue;
				delete cell.editValue;
			}
		});
	}
		
});

Mif.Grid.KeyNav=new Class({

	keyNav: function(){
		var eventType=Browser.Engine.trident||Browser.Engine.gecko ? 'keydown' : 'keypress';
		this.main.addEvent(eventType,function(event){
			if(event.key=='esc') {
				this.editCancel(); 
				return false;
			}
			if(event.key=='space') {
				if(this.state=='edited') return;
				this.editStart();
				return false;
			}
			if(!['up','left','right','down','enter'].contains(event.key)) return;
			if(['left','right'].contains(event.key) && $(event.target).get('tag')=='input') return;
			this.go(event.key);
			event.preventDefault();
		}.bind(this));
	},
	
	go: function(direction){
		this.editEnd();
		var colId, rowId, colIndex, rowIndex;
		if(!this.current){
			colId=this.order.cols[0];
			rowId=this.order.rows[0];
			colIndex=0;
			rowIndex=0;
		}else{
			rowId=this.current.row;
			colId=this.current.col;
			colIndex=this.order.cols.indexOf(colId);
			rowIndex=this.order.rows.indexOf(rowId);
			switch(direction){
				case 'enter':
				case 'right':
					if(colId==this.order.cols.getLast()) {
						if(rowId==this.order.rows.getLast()) return;
						rowId=this.order.rows[++rowIndex];
						colId=this.order.cols[0];
					}else{
						colId=this.order.cols[++colIndex];
					}
					break;
				case 'left':
					if(colIndex==0) {
						if(rowIndex==0) return;
						rowId=this.order.rows[--rowIndex];
						colId=this.order.cols.getLast();
					}else{
						colId=this.order.cols[--colIndex];
					}
					break;
				case 'up':
					if(rowIndex==0) return;
					rowId=this.order.rows[--rowIndex];
					break;
				case 'down':
					if(rowIndex==this.order.rows.length-1) return;
					rowId=this.order.rows[++rowIndex];
					break;
			}
		}
		this.select({row:rowId,col:colId});
	}
	
});

Mif.Grid.implement(Grid.KeyNav);

Mif.Grid.Resize=new Class({

	initResizing: function(){
		this.resizer=new Element('div',{'class':'grid-resizer'}).injectInside(document.body);
		this.topRow.addEvent('mousedown',this.resizeStart.bindWithEvent(this));
		document.addEvent('mousemove',this.resize.bindWithEvent(this));
		document.addEvent('mouseup',this.resizeEnd.bind(this));
		document.addEvent('keydown',function(event){
			if(event.key=='esc')  this.resizeCancel();
		}.bind(this));
	},
	
	resize: function(event){
		if(!$chk(this.resizeCol)) return;
		var x=event.page.x;
		this.resizer.setStyles({
			display: 'block',
			left: Math.max(this.minLeft, x)
		});
		this.cols[this.resizeCol].width=Math.max(0, x-this.minLeft) ;
	},
	
	resizeStart: function(event){
		var target=$(event.target);
		
		var left=target.getAncestorOrSelf('.left'), right;
		if(!left) {
			right=target.getAncestorOrSelf('.right');
			if(!right) return;
		}
		var cellEl=target.getAncestorOrSelf('.cell');
		var colId=cellEl.getAttribute('colid');;
		var col=this.order.cols.indexOf(colId);
		if(col==0 && left) return;
		if(left) {
			col--;
			colId=this.order.cols[col];
		}
		this.resizeCol=colId;
		this.minLeft=cellEl.getLeft() - (left ? this.cols[colId].width : 0);
	},
	
	resizeEnd: function(){
		if(!$chk(this.resizeCol)) return;
		this.resizeCol=null;
		this.resizer.style.display='none';
		this.setWidth();
		this.setLayoutsPosition();
		if(this.state=='selected') this.setSelectorPos();
		if(this.state=='edited') this.setEditorPos();
	},
	
	resizeCancel: function(){
		this.resizeCol=null;
		this.resizer.style.display='none';
	}
	
});

Mif.Grid.implement(Mif.Grid.Resize);

Element.implement({

	getAncestorOrSelf: function(match){
		var parent=this;
		while(parent){
			if(parent.match(match)) return parent;
			parent=parent.getParent();
		}
		return false;
	},
	
	addSides: function(sides){
		sides=sides||['left','top','right','bottom','lt','rt','lb','rb'];
		sides.each(function(side){
			new Element('div',{'class':side}).injectInside(this);
		}, this);
		return this;
	},
	
	unselect : function(){
		this.addEvent('mousemove',function(event){
			if (window.getSelection) {
				window.getSelection().removeAllRanges(); 
			}
			else if (document.selection && document.selection.clear){
				if(!document.selection.type) return;
				if($(document.selection.createRange().parentElement()).get('tag')=='input') return;
				document.selection.empty();
			}
		}.bind(this));
		if(Browser.Engine.trident) this.addEvent("selectstart", function(event){
			if($(event.target).get('tag')=='input') return;
			return false;
		});
		return this;
	}

});

String.implement({

	repeat: function(n){
		var string='';
		var i=0;
		while(i!=n){
			string+=this;
			i++;
		}
		return string;
	}

})

Document.implement({
	setStyles2Class: function(styles, match){
		if(!arguments.callee.stylesheet){
			if(window.ie){
				arguments.callee.stylesheet = document.createStyleSheet();
			}else{
				new Element('style').injectInside(document.head);
				arguments.callee.stylesheet=$A(document.styleSheets).getLast();
			}
		}
		var stylesheet=arguments.callee.stylesheet;
		if($type(styles)=='object'){
			var _styles=[];
			for(var p in styles){
				_styles.push(p.hyphenate(),':',styles[p],';');
			}
			styles=_styles.join('');
		}
		if(stylesheet.addRule){	
			stylesheet.addRule(match,styles);   
		}else{
			stylesheet.insertRule(match+'{'+styles+'}',stylesheet.cssRules.length);
		}
	}
});

var Prefixer=new Class({
				
	initialize: function(options){
		this.element=new Element('div');
		this.span=new Element('span',{'html':options.prefix});
		this.input=new Element('input').setStyle('position','absolute');
		this.element.adopt(this.span,this.input).injectInside(document.body);
		if(options.styles) this.element.setStyles(options.styles);
		if(options['class']) this.element.addClass(options['class']);
	},
	
	position: function(){
		this.input.setStyles({
			width: this.element.clientWidth-this.span.offsetWidth,
			left: this.span.offsetWidth
		});
		return this.element;
	}
		
});