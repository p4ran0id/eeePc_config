function LPMetaTypes(){this.body=function(){};this.section=function(){};this.form=function(){};this.input=function(){};this.button=function(){};this.P_UNKNOWN=0;this.P_RESET=1;this.P_PRESENTATIONAL=2;this.P_SUBSCRIBE=3;this.P_LOGINSUBMIT=4;this.P_PWCHANGESUBMIT=5;this.P_CANCEL=6;this.popup=function(){};this.frame=function(){}}function interpretForm(){}
function interpretElement(c,a){if(!c||!a)return null;a.tagName.toUpperCase();var b=getMetaFormForElement(c,a);getFormVector(c,b);b=createMetaElement(c,a);getFieldVector(c,b);b.purpose=0;return b}
function createMetaElement(c,a){var b,d=fieldcacheget(c,a,"meta-elt");if(null!==d)return JSON.parse(d);"BODY"==a.tagName?b=new LPMetaType.body:elt_is_formlike_container(a)?b=new LPMetaType.form:elt_is_inputlike(a)?b=new LPMetaType.input:elt_is_selectlike(a)?b=new LPMetaType.select:elt_is_framelike(a)?b=new LPMetaType.frame:elt_is_buttonlike(a)?b=new LPMetaType.button:elt_is_structural(a)&&(b=new LPMetaType.section);b&&(b.mid=0,b.tagName=a.tagName,b.form=getMetaFormForElement(c,a));formcacheset(c,
a,"meta-elt",JSON.stringify(b));return b}function computePrelimParse(c,a){var b=formcacheget(c,a.mid,"prelims");if(null!==b)return JSON.parse(b);b={t:1,p:1,s:1,h:3,modifiers:{}};formcacheset(c,a.mid,"prelims",JSON.stringify(b));return b}function getFormVector(c,a,b){c=computePrelimParse(c,b);return a.lookup(c)}function getMetaFormForElement(c,a){return!c||!a?null:a.form?getMetaFormforForm(c,a.form):formlike}function getMetaFormForMetaElement(c,a){return!c||!a?null:a.meta_form}
function interpretPage(c){var a=createMetaElement(c,c.body?c.body:c.frameset),b;for(b in a.node.children)interpretNode(c,a.node.children[b]);return!0}function interpretNode(c,a){var b=createMetaElement(c,a),d;if(b)if(should_descend)for(d in meta_body.node.children){if(interpretNode(c,meta_body.node.children[d]),should_stop)break}else return b};
