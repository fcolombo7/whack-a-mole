/** 
 * This script is used to define the parameters and the logic of the game  
 **/
var maxTimer = 3; // max wake up time
var multFactor = 2; // the sleep time can be twice the wake up time.

const moleStatus = {
    ASLEEP: 0,
    AWAKE: 1
}

class Mole {
    /**
     * Class representing a single mole of the game.
     * Each mole starts as ASLEEP
     * @param {int} id, mole identifier
     * @param {int} maxTimer, maximum wake up time [sec]
     * @param {float} multFactor, multiplier factor used to set the maximum sleep time with respect to the maximum wake up time 
     */
    constructor(id, maxTimer, multFactor){
        this.id = id;
        this.status = moleStatus.ASLEEP;
        this.max = maxTimer;
        this.factor = multFactor;
    }
    
    /**
     * Initialization of the mole
     */
    init(){
        let timerLength = Math.round((Math.random() * this.max *this.factor + 1)*1000);
        var mole = this;
        this.timer = setTimeout(function(){ mole.swap(); }, timerLength);
    }

    /**
     * method used to set up a timer changeing the status of the mole.
     */
    swap(){
        let timerLength = 0;
        if(this.status == moleStatus.ASLEEP){
            this.status = moleStatus.AWAKE;
            timerLength = Math.round((Math.random() * this.max + 1)*1000);
        }
        else{
            this.status = moleStatus.ASLEEP;
            timerLength = Math.round((Math.random() * this.max *this.factor + 1)*1000);
        } 
        var mole = this;
        this.timer = setTimeout(function(){ mole.swap(); }, timerLength);
    }
    
    /**
     * Whack a mole
     * @returns true if the mole was AWAKE. In that case the male change status.
     */
    whack(){
        if(this.status == moleStatus.AWAKE){
            clearTimeout(this.timer);
            this.swap();
            return true;
        }
        return false;
    }
    
    /**
     * stop the timer that is running.
     */
    stop(){
        try{
            clearTimeout(this.timer);
        }catch(error){
            console.error(error);
        }
        this.status = moleStatus.ASLEEP;
    }
    
    /**
     * @returns the current mole status
     */
    getStatus(){
        return this.status;
    }

    /**
     * Set the timer values
     * @param {int} maxValue, maximum wake up time [sec]
     * @param {float} multFactor, multiplier factor for the sleep time
     */
    setMaxTimerLength(maxValue, multFactor){
        this.max = maxValue;
        this.factor = multFactor; 
    }
}

class Game{
    /**
     * Game initialization with the starting parameters
     */
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

    /**
     *  Start the game with the initialization of each mole 
     */
    start(){
        if(!this.isStarted){
            this.isStarted = true;
            for(var mole of this.moles_arr){
                mole.init();
            }
        }
    }

    /**
     * Stop the game and all the moles
     */
    stop(){
        if(this.isStarted){
            for(var mole of this.moles_arr){
                mole.stop();
            }
            this.isStarted=false;
        }
    }

    /**
     * Retrieve all the moles' status
     * @returns an array containing all the status 
     */
    getAllStatus(){
        let status_arr = [];
        this.moles_arr.forEach(mole => status_arr.push(mole.getStatus()));
        return status_arr;
    }

    /**
     * Whack the mole passed as parameter
     * @param {int} moleId, the mole to whack
     * @returns the current score and the actual lives 
     */
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

    /**
     * @returns true, if the game is started
     */
    isPlaying(){
        return this.isStarted;
    }
}
