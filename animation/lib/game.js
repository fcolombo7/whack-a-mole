/** PARAMETERS AND LOGIC OF THE GAME */
var maxTimer = 3; // max wake up time
var multFactor = 2; // the sleep time can be twice the wake up time.

const moleStatus = {
    SLEEP: 0,
    AWAKE: 1
}

class Mole {
    constructor(id, maxTimer, multFactor){
        this.id = id;
        this.status = moleStatus.SLEEP;
        this.max = maxTimer;
        this.factor = multFactor;
    }
    
    init(){
        let timerLength = Math.round((Math.random() * this.max *this.factor + 1)*1000);
        var mole = this;
        this.timer = setTimeout(function(){ mole.swap(); }, timerLength);
    }

    swap(){
        console.log("[Mole-"+this.id+"] "+this.status);
        let timerLength = 0;
        if(this.status == moleStatus.SLEEP){
            this.status = moleStatus.AWAKE;
            timerLength = Math.round((Math.random() * this.max + 1)*1000);
        }
        else{
            this.status = moleStatus.SLEEP;
            timerLength = Math.round((Math.random() * this.max *this.factor + 1)*1000);
        } 
        console.log("[Mole-"+this.id+"] Timer fired:"+timerLength+" ms.")
        var mole = this;
        this.timer = setTimeout(function(){ mole.swap(); }, timerLength);
    }
    
    whack(){
        if(this.status == moleStatus.AWAKE){
            clearTimeout(this.timer);
            this.swap();
            return true;
        }
        return false;
    }
    
    stop(){
        try{
            clearTimeout(this.timer);
        }catch(error){
            console.error(error);
        }
        this.status = moleStatus.SLEEP;
    }
    
    getStatus(){
        return this.status;
    }

    setMaxTimerLength(maxValue, multFactor){
        this.max = maxValue;
        this.factor = multFactor; 
    }
}

class Game{
    constructor(){
      this.score = 0;
      this.lives = 3;
      this.isStarted = false;
      this.n_moles = 5;
      this.moles_arr = [];
      for(let i=0; i<this.n_moles; i++){
          var mole = new Mole(i, maxTimer, multFactor);
          this.moles_arr.push(mole);
      }
    }

    start(){
        if(!this.isStarted){
            this.isStarted = true;
            for(var mole of this.moles_arr){
                mole.init();
            }
        }
    }
    stop(){
        if(this.isStarted){
            this.isStarted=false;
            for(var mole of this.moles_arr){
                mole.stop();
            }
        }
    }

    getAllStatus(){
        let status_arr = [];
        this.moles_arr.forEach(mole => status_arr.push(mole.getStatus()));
        return status_arr;
    }

    whackMole(moleId){
        if(this.isStarted){
            let result = this.moles_arr[moleId].whack();
            if(result){
                this.score +=1;
            }else{
                this.lives -=1;
            }
            //check the end of the game
            if(this.lives<=0){
                this.stop();
            }
            return {'score': this.score, 'lives':this.lives}
        }
    }
}
