// Public configuration only. NEVER put secrets in a browser-delivered file.
export const CONFIG = Object.freeze({
  chainId: 11155111,
  networkName: 'Sepolia',
  contractAddress: '', // Populate only after a real, successful deployment.
  deploymentBlock: 0,
  expectedOwner: '0x2F46E8D1510606Ac7C1217DFF710dCc3356D00d5',
  rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com', 'https://rpc.sepolia.org'],
  explorerUrl: 'https://sepolia.etherscan.io',
  logChunkSize: 2000
});
