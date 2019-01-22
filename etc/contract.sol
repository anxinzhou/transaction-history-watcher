pragma solidity ^0.5.2;

library SafeMath {
  function mul(uint256 a, uint256 b) internal pure returns (uint256) {
    // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
    // benefit is lost if 'b' is also tested.
    // See: https://github.com/OpenZeppelin/openzeppelin-solidity/pull/522
    if (a == 0) {
      return 0;
    }

    uint256 c = a * b;
    require(c / a == b);

    return c;
  }

  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b > 0); // Solidity only automatically asserts when dividing by 0
    uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold

    return c;
  }

  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b <= a);
    uint256 c = a - b;

    return c;
  }

  function add(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    require(c >= a);

    return c;
  }

  function mod(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b != 0);
    return a % b;
  }
}

contract BasicToken {
    using SafeMath for uint256;

    uint256 internal _totalSupply;

    string public name;

    uint8 public decimals;

    string public symbol;

    mapping (address => uint256) internal _balances;

    mapping (address => mapping (address => uint256)) internal _allowed;


    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);

    constructor (
        uint256 totalSupply,
        string memory tokenName,
        string memory tokenSymbol
    ) public {
        decimals = 18;
        _totalSupply = totalSupply* 10**uint(decimals);
        _balances[msg.sender] = _totalSupply;
        name = tokenName;
        symbol = tokenSymbol;
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address owner) public view returns (uint256) {
        return _balances[owner];
    }

    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowed[owner][spender];
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(value <= _balances[from]);
        require(to != address(0));

        _balances[from] = _balances[from].sub(value);
        _balances[to] = _balances[to].add(value);
    }

    function transfer(address to, uint256 value) public returns (bool) {
        _transfer(msg.sender, to, value);
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) public returns (bool) {
        require(spender != address(0));

        _allowed[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(value <= _allowed[from][msg.sender]);
        _allowed[from][msg.sender] = _allowed[from][msg.sender].sub(value);

        _transfer(from, to, value);
        emit Transfer(from, to, value);
        return true;
    }
}

contract GameToken is BasicToken {
    // creator of this contract
    address internal _owner;
    uint public exchangeRate = 500;
    uint public exchangeBase = 1;

    event Mint(address user, uint amount);
    event Burn(address user, uint amount);

    constructor (
        uint256 totalSupply,
        string memory tokenName,
        string memory tokenSymbol
    ) BasicToken(totalSupply,tokenName,tokenSymbol) payable public {
        _owner = msg.sender;
    }

    function mint(address user, uint amount) public returns(bool){
        _balances[user]+=amount;
    }

    function burn(address user, uint amount) public returns(bool) {
        require(_balances[user]>=amount);
        _balances[user]-=amount;
    }

    function exchangeForToken(address user) public payable returns (bool) {
        uint tokenAmount = msg.value * exchangeRate/exchangeBase;
        _balances[user] +=tokenAmount;
    }

    function exchangeForEther(address payable user, uint amount) public returns (bool) {
        uint etherAmount = amount*exchangeBase/exchangeRate;
        require(_balances[user]>=amount);
        _balances[user]-=amount;
        user.transfer(etherAmount);
    }

    function reward(address to, uint256 value) public returns (bool) {
        _balances[to] +=value;
        return true;
    }

    function consume(address by, uint256 value) public returns (bool){
        require(_balances[by]>=value);
        _balances[by] -=value;
        return true;
    }
}