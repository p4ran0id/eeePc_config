#
# ~/.bashrc
#

# If not running interactively, don't do anything
[[ $- != *i* ]] && return

alias ls='ls --color=auto'

PS1='[\u@\h \W]\$ '
[ -r /home/p4ran0id/.byobu/prompt ] && . /home/p4ran0id/.byobu/prompt   #byobu-prompt#


